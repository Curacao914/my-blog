import crypto from 'crypto'

import {
  getSupabaseRestConfig,
  getSupabaseStorageConfig
} from '@/lib/db/client'
import { buildTextPack, cleanText, summarizeTextPack, validateTextPack } from '@/lib/course/textpack'
import { getNextCourseWorkerTask, getNextCourseWorkerTasks } from '@/lib/course/workerTasks'
import {
  approveFinalReviewHuman,
  approveNode,
  approveNodeHuman,
  approveOutline,
  applyNodeReview,
  assembleFinalNote,
  completeFinalReview,
  cancelWorkflow,
  createInitialWorkflow,
  mergeTextPackIntoWorkflow,
  failStep,
  pauseWorkflow,
  recordNodeTaskFailure,
  planNodesFromOutline,
  replaceOutline,
  requestNodeRevision,
  retryNode,
  resumeWorkflow,
  saveCourseSpec,
  saveFinalNoteDraft,
  saveNodeDraft,
  startOutlineReview
} from '@/lib/course/workflowState'

async function supabaseRequest(pathname, options = {}) {
  const { baseUrl, headers } = getSupabaseRestConfig()
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed ${response.status}: ${text}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function normalizeJobInput(input = {}) {
  const courseName = String(input.courseName || input.course_name || '').trim()
  if (!courseName) {
    throw new Error('courseName is required')
  }

  return {
    course_name: courseName,
    lesson: String(input.lesson || '').trim() || null,
    teacher: String(input.teacher || '').trim() || null,
    run_mode: input.runMode || input.run_mode || 'course_batch',
    status: 'created',
    current_node: null,
    changelog: [
      {
        at: new Date().toISOString(),
        event: 'created',
        note: '课程整理批次已创建，等待上传一份或多份 SRT 及对应课件。'
      }
    ]
  }
}

export async function createCourseJob(input) {
  const job = normalizeJobInput(input)
  const rows = await supabaseRequest('/course_jobs', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(job)
  })

  return rows?.[0] || null
}

export async function listCourseJobs(limit = 6) {
  const jobs = await supabaseRequest(
    `/course_jobs?select=id,course_name,lesson,teacher,status,current_node,preferences,preprocess_result,preprocess_reported_at,local_workdir,material_bundle_confirmed_at,preflight_confirmed_at,created_at,updated_at&order=created_at.desc&limit=${limit}`
  )

  return Promise.all(
    (jobs || []).map(async job => ({
      ...job,
      assets: await listCourseAssets(job.id),
      lessons: await listCourseLessons(job.id)
    }))
  )
}

export async function listTextPackCourseJobs(ownerId, limit = 20) {
  const ownerFilter = encodeURIComponent(
    JSON.stringify({ web_adapter: { ownerProfileId: ownerId, source: 'textpack-v1' } })
  )
  const jobs = await supabaseRequest(
    `/course_jobs?select=id,course_name,lesson,teacher,status,current_node,preferences,preprocess_reported_at,created_at,updated_at&preferences=cs.${ownerFilter}&order=updated_at.desc&limit=${Math.min(Number(limit) || 20, 60)}`
  )

  return (jobs || []).map(job => ({
    ...job,
    runtime_summary: job.preferences?.web_adapter?.runtimeSummary || null
  }))
}

export async function getCourseJobById(jobId) {
  const rows = await supabaseRequest(
    `/course_jobs?select=id,course_name,lesson,teacher,run_mode,status,current_node,preferences,preprocess_result,preprocess_reported_at,local_workdir,material_bundle_confirmed_at,preflight_confirmed_at,changelog,created_at,updated_at&id=eq.${encodeURIComponent(jobId)}&limit=1`
  )

  return rows?.[0] || null
}

function defaultPreferences(job, input = {}) {
  return {
    course_name: input.courseName || input.course_name || job.course_name,
    teacher: input.teacher || job.teacher || '',
    total_lessons: input.totalLessons ? Number(input.totalLessons) : null,
    domain: input.domain || '法学',
    teaching_style: {
      follows_ppt_strictly: Boolean(input.followsPptStrictly),
      tends_to_digress: Boolean(input.tendsToDigress),
      has_warmup_questions: Boolean(input.hasWarmupQuestions),
      dense_legal_references: Boolean(input.denseLegalReferences)
    },
    learning_goal: input.learningGoal || '自学 / 入门',
    secondary_goal: input.secondaryGoal || '',
    ppt_type: input.pptType || 'auto',
    preferences: {
      include_english_terms: Boolean(input.includeEnglishTerms),
      prefer_visual_tables: Boolean(input.preferVisualTables),
      term_overrides: input.termOverrides || {}
    },
    web_adapter: {
      material_bundle: true,
      allow_multiple_slide_decks: true,
      allow_multiple_transcripts: true,
      sequential_lesson_run: true,
      model_aligns_slides_to_transcript: true
    }
  }
}

function appendChangelog(job, event, note) {
  return [
    ...(Array.isArray(job.changelog) ? job.changelog : []),
    {
      at: new Date().toISOString(),
      event,
      note
    }
  ]
}

function textPackImportKey(ownerId, textPack) {
  const sourceHash =
    textPack?.manifest?.sourceHash ||
    textPack?.checksums?.sourceHash ||
    crypto.createHash('sha256').update(JSON.stringify(textPack || {})).digest('hex')
  return `${ownerId}:${sourceHash}`
}

async function findExistingTextPackJob(ownerId, textPack) {
  const importKey = textPackImportKey(ownerId, textPack)
  const ownerFilter = encodeURIComponent(
    JSON.stringify({
      web_adapter: {
        ownerProfileId: ownerId,
        source: 'textpack-v1',
        importKey
      }
    })
  )
  const rows = await supabaseRequest(
    `/course_jobs?select=id,course_name,lesson,teacher,status,current_node,preferences,preprocess_result,preprocess_reported_at,created_at,updated_at&preferences=cs.${ownerFilter}&order=updated_at.desc&limit=1`
  )
  return rows?.[0] || null
}

function buildTextPackPreprocessResult(textPack, summary) {
  const workflow = createInitialWorkflow({
    textPack,
    courseName: summary.courseName,
    teacher: textPack.course?.teacher || ''
  })
  return {
    ok: true,
    source: 'textpack-v1',
    importedAt: new Date().toISOString(),
    next: summary.ocrRequired
      ? '课程资料已导入；部分图片课件仍需要文字识别或补充文字。'
      : '课程资料已导入，可以继续确认偏好并设计大纲。',
    textPack,
    transcripts: textPack.lessons.map(lesson => ({
      lesson: lesson.order,
      key: lesson.key,
      title: lesson.title,
      charCount: lesson.transcriptCharCount,
      lineCount: lesson.transcriptLineCount,
      segmentCount: lesson.segments?.length || 0
    })),
    segments: textPack.lessons.flatMap(lesson =>
      (lesson.segments || []).map(segment => ({
        lesson: lesson.order,
        key: segment.key,
        startLine: segment.startLine,
        endLine: segment.endLine,
        charCount: segment.charCount
      }))
    ),
    pptText: textPack.ppt_text.map(deck => ({
      key: deck.key,
      title: deck.title,
      slideCount: deck.slideCount,
      charCount: deck.charCount,
      textDensity: deck.textDensity,
      ocrRequired: deck.ocrRequired
    })),
    pptNeedsOcr: textPack.ppt_text
      .filter(deck => deck.ocrRequired)
      .map(deck => ({
        deck: deck.title,
        key: deck.key,
        note: '课件文字较少，需要文字识别。'
      })),
    failures: [],
    workflow
  }
}

export async function importCourseTextPack(ownerId, textPack) {
  const validation = validateTextPack(textPack)
  const summary = summarizeTextPack(textPack)
  const preprocessResult = buildTextPackPreprocessResult(textPack, summary)
  const initialRuntimeSummary = courseRuntimeSummary(preprocessResult.workflow)
  const existing = await findExistingTextPackJob(ownerId, textPack)
  if (existing) {
    return { job: existing, existing: true, summary }
  }

  const importKey = textPackImportKey(ownerId, textPack)
  const now = new Date().toISOString()
  const rows = await supabaseRequest('/course_jobs', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      course_name: summary.courseName,
      lesson: textPack.course?.lessonRange || null,
      teacher: textPack.course?.teacher || null,
      run_mode: 'course_batch',
      status: 'preprocessing',
      current_node: 'imported',
      preferences: {
        ...(textPack.preferences || {}),
        course_name: summary.courseName,
        teacher: textPack.course?.teacher || '',
        web_adapter: {
          ownerProfileId: ownerId,
          source: 'textpack-v1',
          importKey,
          schemaVersion: textPack.schemaVersion,
          importedAt: now,
          browserPreprocessed: true,
          rawFilesPersisted: false,
          runtimeSummary: initialRuntimeSummary,
          orchestrator: {
            version: 1,
            runId: '',
            state: 'idle',
            waitingReason: '',
            hookToken: '',
            updatedAt: now
          }
        },
        textpack_stats: validation.stats
      },
      preprocess_result: preprocessResult,
      preprocess_reported_at: now,
      material_bundle_confirmed_at: now,
      changelog: [
        {
          at: now,
          event: 'textpack-imported',
          note: `导入课程资料：${summary.lessonCount} 课，${summary.deckCount} 份课件，${summary.totalChars} 字符。`
        }
      ]
    })
  })

  const job = rows?.[0] || null
  if (job) {
    await upsertCourseLessons(
      textPack.lessons.map((lesson, index) => ({
        job_id: job.id,
        lesson_order: lesson.order,
        lesson_key: lesson.key,
        title: lesson.title,
        status: 'preprocessed',
        previous_context: {
          mode: index === 0 ? 'first-lesson' : 'rolling-course-context',
          source: 'textpack-v1'
        },
        changelog: [
          {
            at: now,
            event: 'textpack-lesson-imported',
            note: `${lesson.sourceFile || lesson.title} 已作为纯文字课程资料导入。`
          }
        ],
        updated_at: now
      }))
    )
  }

  return { job, existing: false, summary }
}


function mergeStoredTextPacks(existing, incoming) {
  const lessons = new Map((existing.lessons || []).map(lesson => [lesson.key, { ...lesson, materials: [...(lesson.materials || [])], sourceMap: [...(lesson.sourceMap || [])] }]))
  ;(incoming.lessons || []).forEach(lesson => {
    const current = lessons.get(lesson.key)
    if (!current) {
      lessons.set(lesson.key, lesson)
      return
    }
    const currentLines = cleanText(current.transcript).split('\n').filter(Boolean).length
    const addition = cleanText(lesson.transcript)
    lessons.set(lesson.key, {
      ...current,
      title: current.title || lesson.title,
      transcript: [cleanText(current.transcript), addition ? `【补充资料】\n${addition}` : ''].filter(Boolean).join('\n'),
      sourceMap: [
        ...(current.sourceMap || []),
        ...(lesson.sourceMap || []).map(item => ({ ...item, line: Number(item.line || 0) + currentLines + (addition ? 1 : 0) }))
      ],
      materials: [...(current.materials || []), ...(lesson.materials || [])],
      warnings: [...(current.warnings || []), ...(lesson.warnings || [])]
    })
  })

  const usedDeckKeys = new Set()
  const decks = [...(existing.ppt_text || []), ...(incoming.ppt_text || [])].map((deck, index) => {
    let key = deck.key || `deck-${index + 1}`
    if (usedDeckKeys.has(key)) key = `${key}-supplement-${index + 1}`
    usedDeckKeys.add(key)
    return { ...deck, key }
  })

  return buildTextPack({
    course: { ...(existing.course || {}), ...(incoming.course || {}) },
    preferences: { ...(existing.preferences || {}), ...(incoming.preferences || {}) },
    lessons: [...lessons.values()].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    decks,
    warnings: [...(existing.warnings || []), ...(incoming.warnings || [])]
  })
}

export async function supplementCourseTextPack(ownerId, jobId, textPack) {
  validateTextPack(textPack)
  const job = await getTextPackCourseJobForOwner(ownerId, jobId)
  const existingTextPack = job.preprocess_result?.textPack
  if (!existingTextPack) throw new Error('Course TextPack is not available')

  const mergedTextPack = mergeStoredTextPacks(existingTextPack, textPack)
  const validation = validateTextPack(mergedTextPack)
  const summary = summarizeTextPack(mergedTextPack)
  const workflow = mergeTextPackIntoWorkflow(workflowFromJob(job), textPack)
  const now = new Date().toISOString()
  const preprocessResult = {
    ...buildTextPackPreprocessResult(mergedTextPack, summary),
    workflow,
    importedAt: job.preprocess_result?.importedAt || now,
    supplementedAt: now
  }
  const rows = await supabaseRequest(`/course_jobs?id=eq.${encodeURIComponent(job.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      status: statusForWorkflow(workflow),
      current_node: workflow.currentStep || workflow.status,
      preferences: {
        ...(job.preferences || {}),
        textpack_stats: validation.stats,
        web_adapter: {
          ...(job.preferences?.web_adapter || {}),
          supplementedAt: now,
          runtimeSummary: courseRuntimeSummary(workflow)
        }
      },
      preprocess_result: preprocessResult,
      updated_at: now,
      changelog: appendChangelog(job, 'textpack-supplemented', `补充课程资料：当前共 ${summary.lessonCount} 课，${summary.deckCount} 份课件。`)
    })
  })

  await upsertCourseLessons((mergedTextPack.lessons || []).map(lesson => ({
    job_id: job.id,
    lesson_order: lesson.order,
    lesson_key: lesson.key,
    title: lesson.title,
    status: 'preprocessed',
    previous_context: { mode: 'supplemented', source: 'textpack-v1' },
    changelog: [{ at: now, event: 'textpack-supplemented', note: '已补充纯文字课程资料。' }],
    updated_at: now
  })))

  return { job: rows?.[0] || null, workflow, summary, textPack: mergedTextPack }
}

export async function deleteTextPackCourseJob(ownerId, jobId) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')
  const ownerProfileId = job.preferences?.web_adapter?.ownerProfileId
  const source = job.preferences?.web_adapter?.source
  if (ownerProfileId !== ownerId || source !== 'textpack-v1') {
    throw new Error('Course job not found')
  }

  await supabaseRequest(`/course_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'DELETE'
  })
  return { ok: true }
}

export async function getTextPackCourseJobForOwner(ownerId, jobId) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')
  const ownerProfileId = job.preferences?.web_adapter?.ownerProfileId
  const source = job.preferences?.web_adapter?.source
  if (ownerProfileId !== ownerId || source !== 'textpack-v1') {
    throw new Error('Course job not found')
  }
  return {
    ...job,
    lessons: await listCourseLessons(job.id)
  }
}

function migratedLessonStatus(lesson, nodes) {
  if (!nodes.length) return lesson.status
  if (nodes.every(node => node.status === 'node_approved')) return 'assembly_pending'
  if (nodes.some(node => node.status === 'node_revision_required')) return 'node_revision_required'
  if (nodes.some(node => node.status === 'node_pending')) return 'node_pending'
  if (nodes.some(node => node.status === 'node_review')) return 'node_review'
  if (nodes.some(node => ['node_human_review', 'node_failed'].includes(node.status))) return 'node_human_review'
  return lesson.status
}

export function workflowFromJob(job) {
  const workflow = job.preprocess_result?.workflow
  if (!workflow) throw new Error('Course workflow is not initialized')
  const maxAutoRevisions = Number(workflow.courseSpec?.maxAutoRevisions ?? 2)
  const lessons = (workflow.lessons || []).map(lesson => {
    const nodes = (lesson.nodes || []).map(node => {
      const reviewerReports = Array.isArray(node.reviewerReports) ? node.reviewerReports : []
      const latest = reviewerReports.at(-1)?.value
      const versions = Array.isArray(node.versions) ? node.versions : []
      const hasExplicitReviewedVersion = latest?.reviewedDraftVersion !== undefined && latest?.reviewedDraftVersion !== null
      const currentReview = Boolean(latest) && (hasExplicitReviewedVersion
        ? Number(latest.reviewedDraftVersion) === Number(versions.length || 0)
        : node.reviewRequired === false)
      let migratedStatus = node.status === 'node_review' && currentReview && latest?.decision === 'approve' ? 'node_approved'
        : node.status === 'node_review' && currentReview && latest?.decision === 'revise' ? 'node_revision_required'
          : node.status === 'node_review' && currentReview && latest?.decision === 'human_review' ? 'node_human_review' : node.status
      const revisionCount = Number(node.revisionCount || 0)
      if (migratedStatus === 'node_revision_required' && (node.humanReviewRequired || revisionCount >= maxAutoRevisions)) migratedStatus = 'node_human_review'
      let revisionRequests = Array.isArray(node.revisionRequests) ? node.revisionRequests : []
      if (migratedStatus === 'node_revision_required' && !revisionRequests.length && latest) {
        const issues = Array.isArray(latest.issues) ? latest.issues : []
        const message = issues.map(issue => typeof issue === 'string' ? issue : issue?.message || issue?.detail || issue?.type).filter(Boolean).join('；') || latest.summary || '按上一轮审查结果修订本节点。'
        revisionRequests = [{ version: 1, at: latest.checkedAt || new Date().toISOString(), value: { message, issues, source: 'migration' }, source: 'migration' }]
      }
      return {
        ...node,
        status: migratedStatus,
        revisionCount,
        reviewRequired: node.reviewRequired ?? !reviewerReports.length,
        reviewDecision: node.reviewDecision || latest?.decision || null,
        revisionRequests,
        reviewerReports,
        versions,
        taskFailures: node.taskFailures || { writer: 0, reviewer: 0, revision: 0 },
        taskError: node.taskError || null,
        blockedByNodeIds: Array.isArray(node.blockedByNodeIds) ? node.blockedByNodeIds : [],
        blocksDownstream: Boolean(node.blocksDownstream),
        consistencyRequests: Array.isArray(node.consistencyRequests) ? node.consistencyRequests : [],
        humanReviewRequired: Boolean(node.humanReviewRequired || migratedStatus === 'node_human_review' || migratedStatus === 'node_failed')
      }
    })
    return {
      ...lesson,
      status: migratedLessonStatus(lesson, nodes),
      finalReviewReports: Array.isArray(lesson.finalReviewReports) ? lesson.finalReviewReports : [],
      outlineVersions: Array.isArray(lesson.outlineVersions) ? lesson.outlineVersions : [],
      finalNoteVersions: Array.isArray(lesson.finalNoteVersions) ? lesson.finalNoteVersions : [],
      nodes
    }
  })
  const activeLesson = lessons.find(lesson => lesson.status !== 'completed')
  const nodePhase = ['node_pending', 'node_generating', 'node_review', 'node_revision_required', 'node_human_review']
  const normalizedStatus = activeLesson && nodePhase.includes(workflow.status) ? activeLesson.status : workflow.status
  return {
    ...workflow,
    schemaVersion: 'course-workflow.v2',
    status: normalizedStatus,
    resumeStatus: workflow.resumeStatus || null,
    appliedTaskKeys: Array.isArray(workflow.appliedTaskKeys) ? workflow.appliedTaskKeys : [],
    taskLeases: Array.isArray(workflow.taskLeases) ? workflow.taskLeases : (workflow.taskLease ? [workflow.taskLease] : []),
    courseSpec: {
      qualityThreshold: 75,
      nodeSplitThreshold: 12000,
      nodeSplitLineThreshold: 200,
      maxAutoRevisions: 2,
      maxTechnicalRetries: 2,
      reviewConcurrency: 2,
      promptVersion: 'course-controlled-v4-pipeline',
      ...(workflow.courseSpec || {})
    },
    worker: { status: 'offline', lastSeenAt: null, message: '在线课程处理尚未开始', ...(workflow.worker || {}) },
    lessons
  }
}

export function courseRuntimeSummary(workflow = {}) {
  const lessons = Array.isArray(workflow.lessons) ? workflow.lessons : []
  const activeLesson = lessons.find(lesson => lesson.status !== 'completed') || lessons.at(-1) || null
  const nodes = lessons.flatMap(lesson => Array.isArray(lesson.nodes) ? lesson.nodes : [])
  const counts = nodes.reduce((acc, node) => {
    const status = node?.status || 'unknown'
    acc[status] = Number(acc[status] || 0) + 1
    return acc
  }, {})
  const courseStatus = workflow.status || 'preflight_required'
  const status = ['paused', 'failed', 'cancelled', 'completed'].includes(courseStatus)
    ? courseStatus
    : (activeLesson?.status || courseStatus)
  return {
    version: Number(workflow.runtimeVersion || 1),
    workflowVersion: Number(workflow.workflowVersion || 1),
    status,
    courseStatus: workflow.status || status,
    paused: Boolean(workflow.paused),
    cancelled: Boolean(workflow.cancelled),
    progress: Number(workflow.progress || 0),
    lessonKey: activeLesson?.key || '',
    lessonTitle: activeLesson?.title || '',
    counts: {
      total: nodes.length,
      approved: Number(counts.node_approved || 0),
      attention: Number(counts.node_human_review || 0) + Number(counts.node_failed || 0),
      reviewing: Number(counts.node_review || 0),
      revising: Number(counts.node_revision_required || 0),
      pending: Number(counts.node_pending || 0)
    },
    activeTasks: (workflow.taskLeases || []).map(lease => ({
      taskType: lease.taskType || '',
      lessonKey: lease.lessonKey || '',
      nodeId: lease.nodeId || '',
      expiresAt: lease.expiresAt || ''
    })),
    currentErrorId: workflow.activeErrorId || null,
    updatedAt: workflow.updatedAt || new Date().toISOString()
  }
}

export function orchestratorFromPreferences(preferences = {}) {
  return preferences?.web_adapter?.orchestrator || {
    version: 1,
    runId: '',
    state: 'idle',
    waitingReason: '',
    hookToken: '',
    updatedAt: ''
  }
}

export async function getTextPackCourseRuntimeForOwner(ownerId, jobId) {
  const ownerFilter = encodeURIComponent(
    JSON.stringify({ web_adapter: { ownerProfileId: ownerId, source: 'textpack-v1' } })
  )
  const rows = await supabaseRequest(
    `/course_jobs?select=id,course_name,status,current_node,preferences,updated_at&id=eq.${encodeURIComponent(jobId)}&preferences=cs.${ownerFilter}&limit=1`
  )
  const job = rows?.[0]
  if (!job) throw new Error('Course job not found')
  return {
    job: {
      id: job.id,
      course_name: job.course_name,
      status: job.status,
      current_node: job.current_node,
      updated_at: job.updated_at
    },
    runtime: job.preferences?.web_adapter?.runtimeSummary || {
      status: job.current_node || job.status || 'preflight_required',
      courseStatus: job.status || '',
      progress: 0,
      workflowVersion: 0,
      counts: { total: 0, approved: 0, attention: 0, reviewing: 0, revising: 0, pending: 0 },
      activeTasks: [],
      updatedAt: job.updated_at || ''
    },
    orchestrator: orchestratorFromPreferences(job.preferences)
  }
}

export async function getCourseRuntime(jobId) {
  const rows = await supabaseRequest(
    `/course_jobs?select=id,status,current_node,preferences,updated_at&id=eq.${encodeURIComponent(jobId)}&limit=1`
  )
  const job = rows?.[0]
  if (!job) throw new Error('Course job not found')
  return {
    job,
    runtime: job.preferences?.web_adapter?.runtimeSummary || {
      status: job.current_node || job.status || 'preflight_required',
      courseStatus: job.status || '',
      progress: 0,
      workflowVersion: 0,
      counts: { total: 0, approved: 0, attention: 0, reviewing: 0, revising: 0, pending: 0 },
      activeTasks: [],
      updatedAt: job.updated_at || ''
    },
    orchestrator: orchestratorFromPreferences(job.preferences)
  }
}

export async function getCourseOrchestrator(jobId) {
  const result = await getCourseRuntime(jobId)
  return result.orchestrator
}

export async function patchCourseOrchestrator(jobId, patch = {}) {
  const result = await getCourseRuntime(jobId)
  const preferences = result.job.preferences || {}
  const webAdapter = preferences.web_adapter || {}
  const orchestrator = {
    ...orchestratorFromPreferences(preferences),
    ...patch,
    version: Number(orchestratorFromPreferences(preferences).version || 1),
    updatedAt: new Date().toISOString()
  }
  const rows = await supabaseRequest(`/course_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      preferences: {
        ...preferences,
        web_adapter: { ...webAdapter, orchestrator }
      },
      updated_at: new Date().toISOString()
    })
  })
  return rows?.[0] || null
}

function statusForWorkflow(workflow) {
  if (workflow.status === 'completed') return 'done'
  if (workflow.status === 'failed') return 'failed'
  return 'preprocessing'
}

async function patchCourseWorkflow(job, workflow, event, note) {
  const nextWorkflow = {
    ...workflow,
    workflowVersion: Number(workflow.workflowVersion || 0) + 1,
    updatedAt: new Date().toISOString()
  }
  const preprocessResult = {
    ...(job.preprocess_result || {}),
    workflow: nextWorkflow
  }
  const preferences = job.preferences || {}
  const webAdapter = preferences.web_adapter || {}
  const rows = await supabaseRequest(`/course_jobs?id=eq.${encodeURIComponent(job.id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      status: statusForWorkflow(nextWorkflow),
      current_node: nextWorkflow.currentStep || nextWorkflow.status,
      preferences: {
        ...preferences,
        web_adapter: {
          ...webAdapter,
          runtimeSummary: courseRuntimeSummary(nextWorkflow)
        }
      },
      preprocess_result: preprocessResult,
      updated_at: nextWorkflow.updatedAt,
      changelog: event ? appendChangelog(job, event, note) : (job.changelog || [])
    })
  })

  return rows?.[0] || null
}

export async function applyCourseWorkflowAction(ownerId, jobId, action = {}) {
  const job = await getTextPackCourseJobForOwner(ownerId, jobId)
  const workflow = workflowFromJob(job)
  const type = String(action.type || '').trim()
  let nextWorkflow = workflow
  let note = ''

  if (type === 'save-course-spec') {
    nextWorkflow = saveCourseSpec(workflow, action.courseSpec || {})
    note = '课程偏好已保存。'
  } else if (type === 'save-outline') {
    nextWorkflow = startOutlineReview(workflow, { lessonKey: action.lessonKey, outline: action.outline || [], mainLine: action.mainLine || '' })
    note = '课程大纲已保存，等待确认。'
  } else if (type === 'edit-outline') {
    nextWorkflow = replaceOutline(workflow, action.lessonKey, action.outline || [])
    note = '课程大纲已更新。'
  } else if (type === 'approve-outline') {
    nextWorkflow = approveOutline(workflow, action.lessonKey)
    note = '课程大纲已批准。'
  } else if (type === 'save-node-draft') {
    if (action.reviewerReport || action.qualityReport || action.report || action.decision) throw new Error('审查结果只能由课程处理服务写入')
    nextWorkflow = saveNodeDraft(workflow, action.lessonKey, action.nodeId, action.markdown, { source: 'user' })
    note = '节点草稿已保存。'
  } else if (type === 'request-node-revision') {
    nextWorkflow = requestNodeRevision(workflow, action.lessonKey, action.nodeId, action.request || '')
    note = '节点修改要求已保存，等待局部重写。'
  } else if (type === 'approve-node') {
    nextWorkflow = approveNode(workflow, action.lessonKey, action.nodeId)
    note = '节点已确认。'
  } else if (type === 'approve-node-human') {
    nextWorkflow = approveNodeHuman(workflow, action.lessonKey, action.nodeId, action.reason || '')
    note = '节点已由用户确认。'
  } else if (type === 'retry-node') {
    nextWorkflow = retryNode(workflow, action.lessonKey, action.nodeId)
    note = '节点已重新加入处理队列。'
  } else if (type === 'save-final-note') {
    nextWorkflow = saveFinalNoteDraft(workflow, action.lessonKey, action.markdown || '')
    note = '最终笔记的人工修改已保存。'
  } else if (type === 'approve-final-review') {
    nextWorkflow = approveFinalReviewHuman(workflow, action.lessonKey)
    note = '最终笔记已由用户确认。'
  } else if (type === 'pause') {
    nextWorkflow = pauseWorkflow(workflow); note = '课程流程已暂停。'
  } else if (type === 'resume' || type === 'retry') {
    nextWorkflow = resumeWorkflow(workflow); note = type === 'retry' ? '失败步骤已准备重试。' : '课程流程已恢复。'
  } else if (type === 'cancel') {
    nextWorkflow = cancelWorkflow(workflow, action.reason || ''); note = '课程流程已取消，已有内容仍然保留。'
  } else throw new Error('当前操作不可用')

  const updated = await patchCourseWorkflow(job, nextWorkflow, `workflow-${type}`, note)
  return { job: updated, workflow: updated?.preprocess_result?.workflow || nextWorkflow }
}

export async function claimCourseWorkerTasks(jobId, leaseSeconds = 180) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')
  const workflow = workflowFromJob(job)
  const now = Date.now()
  const activeLeases = (workflow.taskLeases || []).filter(lease => lease?.taskKey && Date.parse(lease.expiresAt || '') > now)
  if (activeLeases.length) {
    return { job, workflow, tasks: [{ type: 'idle', reason: 'task-leased', taskKeys: activeLeases.map(lease => lease.taskKey), expiresAt: activeLeases[0].expiresAt }] }
  }

  const tasks = getNextCourseWorkerTasks(workflow, {
    reviewConcurrency: Number(workflow.courseSpec?.reviewConcurrency || 2),
    totalConcurrency: Math.max(2, Number(workflow.courseSpec?.reviewConcurrency || 2) + 1)
  })
  if (!tasks.length || tasks[0]?.type === 'idle') return { job, workflow, tasks }

  const expiresAt = new Date(now + Math.max(30, Number(leaseSeconds || 180)) * 1000).toISOString()
  const batchId = crypto.randomUUID()
  const taskLeases = tasks.map(task => ({
    batchId,
    taskKey: task.taskKey || `${task.type}:${task.lessonKey || 'course'}`,
    taskType: task.type,
    lessonKey: task.lessonKey || null,
    nodeId: task.node?.id || null,
    claimedAt: new Date(now).toISOString(),
    expiresAt
  }))
  const nextWorkflow = {
    ...workflow,
    taskLease: taskLeases[0] || null,
    taskLeases,
    worker: { ...(workflow.worker || {}), status: 'online', lastSeenAt: new Date(now).toISOString(), message: tasks.length > 1 ? `在线课程处理正在并行执行 ${tasks.length} 项任务` : '在线课程处理正在工作' }
  }
  const updated = await patchCourseWorkflow(job, nextWorkflow, '', '')
  return { job: updated || job, workflow: nextWorkflow, tasks, batchId }
}

export async function claimCourseWorkerTask(jobId, leaseSeconds = 180) {
  const claimed = await claimCourseWorkerTasks(jobId, leaseSeconds)
  return { ...claimed, task: claimed.tasks?.[0] || { type: 'idle', reason: 'no-pending-step' } }
}

function reduceWorkerAction(workflow, action = {}) {
  const type = String(action.type || '').trim()
  let nextWorkflow = workflow
  let note = ''
  if (type === 'heartbeat') {
    nextWorkflow = { ...workflow, worker: { status: 'online', lastSeenAt: new Date().toISOString(), message: String(action.message || '在线课程处理已连接') }, updatedAt: new Date().toISOString() }
  } else if (type === 'save-outline') {
    nextWorkflow = startOutlineReview(workflow, { lessonKey: action.lessonKey, outline: action.outline || [], mainLine: action.mainLine || '', trace: action.trace || null }); note = '课程处理服务已生成大纲。'
  } else if (type === 'plan-nodes') {
    nextWorkflow = planNodesFromOutline(workflow, action.lessonKey); note = '课程处理服务已创建正文节点。'
  } else if (type === 'save-node-draft-worker') {
    const node = workflow.lessons?.find(lesson => lesson.key === action.lessonKey)?.nodes?.find(item => item.id === action.nodeId)
    if (action.basedDraftVersion !== undefined && Number(action.basedDraftVersion) !== Number(node?.versions?.length || 0)) {
      nextWorkflow = workflow; note = '节点在处理期间已有新版本，本次旧结果已忽略。'
    } else {
      nextWorkflow = saveNodeDraft(workflow, action.lessonKey, action.nodeId, action.markdown, { source: action.source || 'worker', trace: action.trace || null }); note = '课程处理服务已生成节点草稿。'
    }
  } else if (type === 'save-node-review') {
    nextWorkflow = applyNodeReview(workflow, action.lessonKey, action.nodeId, action.reviewerReport || action.report || {}, { trace: action.trace || null }); note = '课程处理服务已完成节点审查。'
  } else if (type === 'assemble') {
    nextWorkflow = assembleFinalNote(workflow, action.lessonKey, action.spliceData || {}, { trace: action.trace || null }); note = '课程处理服务已按 Skill 结构拼装最终笔记。'
  } else if (type === 'complete-final-review') {
    nextWorkflow = completeFinalReview(workflow, action.lessonKey, { ...(action.qualityReport || action.report || {}), trace: action.trace || null }); note = '课程处理服务已完成最终检查。'
  } else if (type === 'fail-node-task') {
    nextWorkflow = recordNodeTaskFailure(workflow, { lessonKey: action.lessonKey, nodeId: action.nodeId, taskType: action.taskType, error: action.error, retryable: action.retryable !== false }); note = '节点任务发生技术错误，其他节点继续处理。'
  } else if (type === 'fail-step') {
    nextWorkflow = failStep(workflow, { step: action.step, error: action.error, retryable: action.retryable !== false, taskKey: action.taskKey }); note = '课程处理服务发生技术错误，错误已记录。'
  } else throw new Error('Unsupported worker workflow action')
  return { workflow: nextWorkflow, note, type }
}

export async function applyCourseWorkflowActionsForWorker(jobId, actions = []) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')
  let workflow = workflowFromJob(job)
  const keepPaused = Boolean(workflow.paused || workflow.status === 'paused')
  const leases = new Set((workflow.taskLeases || (workflow.taskLease ? [workflow.taskLease] : [])).map(lease => lease.taskKey))
  const applied = new Set(workflow.appliedTaskKeys || [])
  let note = ''
  let event = ''

  for (const action of actions || []) {
    const type = String(action.type || '').trim()
    const taskKey = String(action.taskKey || '').trim()
    if (type !== 'heartbeat' && leases.size && taskKey && !leases.has(taskKey) && type !== 'fail-step' && type !== 'fail-node-task') throw new Error('Worker task lease does not match the submitted result')
    if (taskKey && applied.has(taskKey)) continue
    const reduced = reduceWorkerAction(workflow, action)
    workflow = reduced.workflow
    note = reduced.note || note
    event = reduced.type || event
    if (taskKey) applied.add(taskKey)
  }

  workflow = {
    ...workflow,
    taskLease: null,
    taskLeases: [],
    appliedTaskKeys: [...applied].slice(-140),
    worker: { ...(workflow.worker || {}), status: 'online', lastSeenAt: new Date().toISOString(), message: '在线课程处理正在工作' }
  }
  if (keepPaused) {
    workflow = {
      ...workflow,
      resumeStatus: workflow.status,
      status: 'paused',
      paused: true,
      worker: { ...(workflow.worker || {}), message: '已暂停领取新任务；在途结果已保存' }
    }
  }
  const updated = await patchCourseWorkflow(job, workflow, event ? `worker-batch-${event}` : '', note)
  return { job: updated, workflow: updated?.preprocess_result?.workflow || workflow }
}

export async function applyCourseWorkflowActionForWorker(jobId, action = {}) {
  return applyCourseWorkflowActionsForWorker(jobId, [action])
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function suggestedCourseWorkdir(jobId) {
  return `/tmp/law-tech-course-${String(jobId).slice(0, 8)}`
}

function buildWorkerCommands({ job, orderedLessons, preprocessResult }) {
  const jobId = job.id
  const workdir = job.local_workdir || suggestedCourseWorkdir(job.id)
  const quotedWorkdir = shellQuote(workdir)
  const quotedJobId = shellQuote(jobId)
  const hasPreprocess = Boolean(job.preprocess_reported_at)
  const needsOcr = Array.isArray(preprocessResult?.pptNeedsOcr) && preprocessResult.pptNeedsOcr.length > 0
  const hasOutlineJson = lesson =>
    lesson.outline_json &&
    typeof lesson.outline_json === 'object' &&
    Object.keys(lesson.outline_json).length > 0
  const outlinesReady = orderedLessons.some(
    lesson => lesson.status === 'outline-ready' || hasOutlineJson(lesson)
  )
  const outlinesConfirmed =
    orderedLessons.length > 0 &&
    orderedLessons.every(lesson => Boolean(lesson.outline_confirmed_at))

  const commands = [
    {
      key: 'prepare',
      label: '准备本地工作目录',
      when: '材料包和 preflight 确认后运行一次。',
      command: `npm run course:worker:prepare-local -- --job-id ${quotedJobId} --out-dir ${quotedWorkdir} --download`
    },
    {
      key: 'preprocess',
      label: '预处理 SRT / PPTX',
      when: '下载材料后运行；支持 --resume 续跑。',
      command: `npm run course:worker:preprocess-local -- --dir ${quotedWorkdir} --resume`
    },
    {
      key: 'report-preprocess',
      label: '回传预处理摘要',
      when: '预处理结束后运行，网页端会显示待 OCR / 失败 / 下一步。',
      command: `npm run course:worker:report-preprocess -- --job-id ${quotedJobId} --result ${quotedWorkdir}/working/preprocess_result.json --workdir ${quotedWorkdir}`
    }
  ]

  if (needsOcr) {
    commands.push(
      {
        key: 'paddle-prepare',
        label: '准备 PaddleOCR 输入',
        when: '存在纯图 PPT 时运行。',
        command: `npm run course:worker:paddle-local -- --dir ${quotedWorkdir} --prepare`
      },
      {
        key: 'paddle-run',
        label: '调用 PaddleOCR',
        when: '需要 PADDLEOCR_ACCESS_TOKEN；完成后再 import。',
        command: `npm run course:worker:paddle-local -- --dir ${quotedWorkdir} --run`
      },
      {
        key: 'paddle-import',
        label: '导入 OCR 结果',
        when: 'OCR 完成后运行，更新 ppt_md 与 preprocess_result。',
        command: `npm run course:worker:paddle-local -- --dir ${quotedWorkdir} --import`
      }
    )
  }

  commands.push(
    {
      key: 'outline-pack',
      label: '生成大纲输入包',
      when: hasPreprocess ? '预处理完成后运行。' : '先完成预处理并回传摘要。',
      command: `npm run course:worker:outline-pack -- --dir ${quotedWorkdir}`
    },
    {
      key: 'outline-dry-run',
      label: '检查大纲请求规模',
      when: '正式调用模型前建议先跑。',
      command: `npm run course:worker:model-exec -- --dir ${quotedWorkdir} --mode outline --dry-run`
    },
    {
      key: 'outline-model',
      label: '生成逐课大纲',
      when: '调用配置好的 COURSE_MODEL_* API，不使用 CC。',
      command: `npm run course:worker:model-exec -- --dir ${quotedWorkdir} --mode outline --continue-on-error`
    },
    {
      key: 'report-outlines',
      label: '回传大纲到网页',
      when: '生成 outline JSON 后运行，然后在网页端确认每课大纲。',
      command: `npm run course:worker:report-outlines -- --job-id ${quotedJobId} --dir ${quotedWorkdir}`
    },
    {
      key: 'node-pack',
      label: '生成节点写作包',
      when: outlinesConfirmed ? '所有大纲已确认，可运行。' : '等网页端确认全部大纲后运行。',
      command: `npm run course:worker:node-pack -- --dir ${quotedWorkdir}`
    },
    {
      key: 'node-dry-run',
      label: '检查节点请求规模',
      when: '正式生成节点笔记前建议先跑。',
      command: `npm run course:worker:model-exec -- --dir ${quotedWorkdir} --mode node --dry-run`
    },
    {
      key: 'node-model',
      label: '生成节点笔记',
      when: '逐节点调用模型 API；可用 --lessons 或 --limit 分批。',
      command: `npm run course:worker:model-exec -- --dir ${quotedWorkdir} --mode node --continue-on-error`
    },
    {
      key: 'assemble',
      label: '拼装单课 Markdown',
      when: '节点笔记完成后运行。',
      command: `npm run course:worker:assemble-notes -- --dir ${quotedWorkdir}`
    },
    {
      key: 'import-content',
      label: '导入内容配置台',
      when: '默认导入为私有草稿；公开与否在内容配置台逐篇设置。',
      command: `npm run course:worker:import-notes -- --dir ${quotedWorkdir} --job-id ${quotedJobId}`
    }
  )

  let nextKey = 'prepare'
  if (hasPreprocess && needsOcr) nextKey = 'paddle-prepare'
  else if (hasPreprocess && !outlinesReady) nextKey = 'outline-pack'
  else if (outlinesReady && !outlinesConfirmed) nextKey = 'confirm-outlines'
  else if (outlinesConfirmed) nextKey = 'node-pack'

  return {
    workdir,
    nextKey,
    commands
  }
}

export async function updateCourseJobSetup(jobId, patch = {}) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')

  const payload = {
    updated_at: new Date().toISOString()
  }

  if (patch.confirmMaterialBundle) {
    payload.material_bundle_confirmed_at = new Date().toISOString()
    payload.changelog = appendChangelog(
      job,
      'material-bundle-confirmed',
      '用户已确认课程材料包，允许多份 SRT 与多份 PPTX，并按课次顺序串行处理。'
    )
  }

  if (patch.preferences) {
    payload.preferences = defaultPreferences(job, patch.preferences)
    payload.preflight_confirmed_at = new Date().toISOString()
    payload.changelog = appendChangelog(
      { ...job, changelog: payload.changelog || job.changelog },
      'preflight-confirmed',
      '用户已确认网页端 preflight 偏好。'
    )
  }

  const rows = await supabaseRequest(`/course_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  })

  const updated = rows?.[0] || null
  return updated
    ? {
        ...updated,
        assets: await listCourseAssets(updated.id)
      }
    : null
}

export async function listCourseAssets(jobId) {
  return supabaseRequest(
    `/course_assets?select=id,kind,role,original_name,mime_type,size_bytes,sort_order,lesson_order,lesson_key,storage_path,checksum,metadata,created_at&job_id=eq.${encodeURIComponent(jobId)}&order=role.asc&order=sort_order.asc&order=created_at.asc`
  )
}

export async function listCourseLessons(jobId) {
  return supabaseRequest(
    `/course_lessons?select=id,job_id,lesson_order,lesson_key,title,status,outline_json,outline_confirmed_at,previous_context,created_at,updated_at&job_id=eq.${encodeURIComponent(jobId)}&order=lesson_order.asc`
  )
}

function parseLessonNumberFromName(fileName) {
  const normalized = String(fileName || '').normalize('NFKC')
  const match =
    normalized.match(/第\s*(\d{1,3})\s*[讲课节]/) ||
    normalized.match(/(?:lesson|lecture|class|session)[-_\s]*(\d{1,3})/i) ||
    normalized.match(/(?:^|[^\d])(\d{1,3})(?:[^\d]|$)/)

  return match ? Number(match[1]) : null
}

function sortTranscriptAssets(assets = []) {
  return [...assets].sort((a, b) => {
    const aLesson = Number(a.lesson_order || 0)
    const bLesson = Number(b.lesson_order || 0)
    if (aLesson && bLesson && aLesson !== bLesson) return aLesson - bLesson
    if (aLesson && !bLesson) return -1
    if (!aLesson && bLesson) return 1

    const aParsed = parseLessonNumberFromName(a.original_name || a.storage_path)
    const bParsed = parseLessonNumberFromName(b.original_name || b.storage_path)
    if (aParsed && bParsed && aParsed !== bParsed) return aParsed - bParsed
    if (aParsed && !bParsed) return -1
    if (!aParsed && bParsed) return 1

    const created = String(a.created_at || '').localeCompare(String(b.created_at || ''))
    if (created !== 0) return created
    return String(a.original_name || '').localeCompare(String(b.original_name || ''))
  })
}

function lessonKeyForAsset(asset, index) {
  const parsed = parseLessonNumberFromName(asset.original_name || asset.storage_path)
  const order = Number(asset.lesson_order || parsed || index + 1)
  return `lesson-${String(order).padStart(2, '0')}`
}

function lessonTitleForAsset(asset, order) {
  const raw = String(asset.original_name || asset.storage_path || '')
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '')
    .trim()

  return raw || `第 ${order} 课`
}

async function upsertCourseLessons(lessons) {
  if (!lessons.length) return []

  return supabaseRequest('/course_lessons?on_conflict=job_id,lesson_order', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(lessons)
  })
}

async function patchCourseAsset(assetId, payload) {
  const rows = await supabaseRequest(
    `/course_assets?id=eq.${encodeURIComponent(assetId)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    }
  )

  return rows?.[0] || null
}

export async function prepareCourseLessons(jobId) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')

  const assets = await listCourseAssets(job.id)
  const transcriptAssets = sortTranscriptAssets(
    assets.filter(asset => asset.role === 'transcript' || asset.kind === 'srt')
  )
  const slideAssets = assets.filter(asset => asset.role === 'slides')

  if (!transcriptAssets.length) {
    throw new Error('At least one SRT transcript is required before preparing lessons.')
  }

  const lessons = transcriptAssets.map((asset, index) => {
    const inferred = parseLessonNumberFromName(asset.original_name || asset.storage_path)
    const lessonOrder = Number(asset.lesson_order || inferred || index + 1)
    const lessonKey = asset.lesson_key || lessonKeyForAsset(asset, index)

    return {
      job_id: job.id,
      lesson_order: lessonOrder,
      lesson_key: lessonKey,
      title: lessonTitleForAsset(asset, lessonOrder),
      transcript_asset_id: asset.id,
      status: 'preprocessed',
      previous_context: {
        mode: 'rolling-course-context',
        source: 'web-adapter',
        note:
          index === 0
            ? '首课不带上一课上下文。'
            : '生成时读取前序课程的摘要、概念、法条、案例和术语，不把全部历史正文硬塞进提示词。'
      },
      changelog: [
        {
          at: new Date().toISOString(),
          event: 'lesson-prepared',
          note: `根据 ${asset.original_name || asset.storage_path} 建立课次映射。`
        }
      ],
      updated_at: new Date().toISOString()
    }
  })

  for (const lesson of lessons) {
    await patchCourseAsset(lesson.transcript_asset_id, {
      lesson_order: lesson.lesson_order,
      lesson_key: lesson.lesson_key,
      metadata: {
        materialBundle: true,
        mappedBy: 'prepareCourseLessons',
        mappedAt: new Date().toISOString()
      }
    })
  }

  const preparedLessons = await upsertCourseLessons(lessons)

  const rows = await supabaseRequest(`/course_jobs?id=eq.${encodeURIComponent(job.id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      status: 'preprocessing',
      current_node: 'lesson-map',
      updated_at: new Date().toISOString(),
      changelog: appendChangelog(
        job,
        'lessons-prepared',
        `已根据 ${transcriptAssets.length} 份 SRT 建立课次序列；${slideAssets.length} 份 PPTX 将作为全课程课件池，由后续 Worker/模型匹配到具体课次。`
      )
    })
  })

  return {
    job: rows?.[0] || null,
    lessons: preparedLessons || [],
    slidePoolCount: slideAssets.length
  }
}

export async function getCourseWorkerManifest(jobId) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')

  const [assets, lessons] = await Promise.all([
    listCourseAssets(job.id),
    listCourseLessons(job.id)
  ])

  const assetsByRole = assets.reduce((acc, asset) => {
    const role = asset.role || 'supplement'
    acc[role] = [...(acc[role] || []), asset]
    return acc
  }, {})

  const transcriptById = new Map(
    (assetsByRole.transcript || []).map(asset => [asset.id, asset])
  )

  const orderedLessons = [...lessons].sort(
    (a, b) => Number(a.lesson_order || 0) - Number(b.lesson_order || 0)
  )
  const preprocessResult = job.preprocess_result || {}
  const worker = buildWorkerCommands({ job, orderedLessons, preprocessResult })

  return {
    version: 1,
    job: {
      id: job.id,
      courseName: job.course_name,
      lessonRange: job.lesson,
      teacher: job.teacher,
      status: job.status,
      preferences: job.preferences || {},
      localWorkdir: worker.workdir
    },
    gates: {
      materialBundleConfirmed: Boolean(job.material_bundle_confirmed_at),
      preflightConfirmed: Boolean(job.preflight_confirmed_at),
      lessonsPrepared: orderedLessons.length > 0,
      outlinesConfirmed:
        orderedLessons.length > 0 &&
        orderedLessons.every(lesson => Boolean(lesson.outline_confirmed_at))
    },
    materialBundle: {
      transcriptCount: assetsByRole.transcript?.length || 0,
      slideDeckCount: assetsByRole.slides?.length || 0,
      readingCount: assetsByRole.reading?.length || 0,
      supplementCount: assetsByRole.supplement?.length || 0,
      slidePool: (assetsByRole.slides || []).map(asset => ({
        id: asset.id,
        name: asset.original_name,
        storagePath: asset.storage_path,
        checksum: asset.checksum
      }))
    },
    preprocessing: {
      reportedAt: job.preprocess_reported_at,
      localWorkdir: job.local_workdir,
      ok: Boolean(preprocessResult.ok),
      needsOcr: Array.isArray(preprocessResult.pptNeedsOcr)
        ? preprocessResult.pptNeedsOcr.length
        : 0,
      failures: Array.isArray(preprocessResult.failures)
        ? preprocessResult.failures.length
        : 0
    },
    lessons: orderedLessons.map((lesson, index) => {
      const transcript = transcriptById.get(lesson.transcript_asset_id)
      return {
        id: lesson.id,
        order: lesson.lesson_order,
        key: lesson.lesson_key,
        title: lesson.title,
        status: lesson.status,
        transcript: transcript
          ? {
              id: transcript.id,
              name: transcript.original_name,
              storagePath: transcript.storage_path,
              checksum: transcript.checksum
            }
          : null,
        contextPolicy:
          index === 0
            ? 'first-lesson'
            : 'use-rolling-course-context-not-full-history',
        outlineConfirmed: Boolean(lesson.outline_confirmed_at)
      }
    }),
    runPlan: [
      'download-material-bundle',
      'extract-slide-text-and-index',
      'align-slide-pool-to-each-transcript',
      'generate-or-refresh-outline-per-lesson',
      'wait-for-user-outline-confirmation',
      'generate-notes-lesson-by-lesson',
      'verify-notes',
      'write-content-snapshots'
    ],
    worker
  }
}

function normalizePreprocessResult(input = {}) {
  const result = input.result || input.preprocessResult || input

  return {
    ok: Boolean(result.ok),
    next: String(result.next || ''),
    transcripts: Array.isArray(result.transcripts) ? result.transcripts : [],
    segments: Array.isArray(result.segments) ? result.segments : [],
    pptText: Array.isArray(result.pptText) ? result.pptText : [],
    pptNeedsOcr: Array.isArray(result.pptNeedsOcr) ? result.pptNeedsOcr : [],
    failures: Array.isArray(result.failures) ? result.failures : [],
    reportedBy: input.reportedBy || 'course-worker',
    reportedAt: new Date().toISOString()
  }
}

export async function reportCoursePreprocessResult(jobId, input = {}) {
  const job = await getCourseJobById(jobId)
  if (!job) throw new Error('Course job not found')

  const preprocessResult = normalizePreprocessResult(input)
  const hasFailures = preprocessResult.failures.length > 0
  const needsOcr = preprocessResult.pptNeedsOcr.length > 0
  const currentNode = hasFailures
    ? 'preprocess-failed'
    : needsOcr
      ? 'preprocess-needs-ocr'
      : 'preprocess-complete'

  const rows = await supabaseRequest(
    `/course_jobs?id=eq.${encodeURIComponent(job.id)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        status: hasFailures ? 'failed' : 'preprocessing',
        current_node: currentNode,
        preprocess_result: preprocessResult,
        preprocess_reported_at: preprocessResult.reportedAt,
        local_workdir: input.localWorkdir || input.local_workdir || job.local_workdir,
        updated_at: new Date().toISOString(),
        changelog: appendChangelog(
          job,
          'preprocess-result-reported',
          `本地预处理回传：转录 ${preprocessResult.transcripts.length}，分段 ${preprocessResult.segments.length}，文字课件 ${preprocessResult.pptText.length}，待 OCR ${preprocessResult.pptNeedsOcr.length}，失败 ${preprocessResult.failures.length}。`
        )
      })
    }
  )

  const updated = rows?.[0] || null
  return updated
    ? {
        ...updated,
        assets: await listCourseAssets(updated.id),
        lessons: await listCourseLessons(updated.id)
      }
    : null
}

export async function getCourseLessonById(lessonId) {
  const rows = await supabaseRequest(
    `/course_lessons?select=id,job_id,lesson_order,lesson_key,title,status,outline_json,outline_confirmed_at,previous_context,changelog,created_at,updated_at&id=eq.${encodeURIComponent(lessonId)}&limit=1`
  )

  return rows?.[0] || null
}

export async function updateCourseLessonOutline(lessonId, patch = {}) {
  const lesson = await getCourseLessonById(lessonId)
  if (!lesson) throw new Error('Course lesson not found')

  const payload = {
    updated_at: new Date().toISOString()
  }

  if (patch.outlineJson) {
    payload.outline_json = patch.outlineJson
    payload.status = 'outline-ready'
  }

  if (patch.confirmOutline) {
    payload.outline_confirmed_at = new Date().toISOString()
    payload.status = 'outline-confirmed'
    payload.changelog = appendChangelog(
      lesson,
      'outline-confirmed',
      '用户已确认本课大纲，可进入节点级生成。'
    )
  }

  const rows = await supabaseRequest(
    `/course_lessons?id=eq.${encodeURIComponent(lessonId)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    }
  )

  return rows?.[0] || null
}

function safeStorageSegment(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function inferAssetKind(fileName, mimeType) {
  const lowerName = String(fileName || '').toLowerCase()
  const type = String(mimeType || '').toLowerCase()

  if (lowerName.endsWith('.srt')) return 'srt'
  if (lowerName.endsWith('.pptx')) return 'pptx'
  if (lowerName.endsWith('.ppt')) return 'ppt'
  if (lowerName.endsWith('.pdf') || type === 'application/pdf') return 'pdf'
  if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) return 'markdown'
  if (type.startsWith('image/')) return 'image'
  return 'other'
}

function inferAssetRole(kind) {
  if (kind === 'srt') return 'transcript'
  if (kind === 'pptx') return 'slides'
  if (kind === 'pdf' || kind === 'markdown') return 'reading'
  return 'supplement'
}

function assertSupportedUpload(fileName, kind) {
  if (kind === 'ppt') {
    throw new Error('PPT is not supported. Please save it as PPTX before uploading.')
  }

  const allowed = new Set(['srt', 'pptx', 'pdf', 'markdown', 'image', 'other'])
  if (!allowed.has(kind)) {
    throw new Error(`Unsupported file type: ${fileName}`)
  }
}

async function uploadBufferToStorage(storagePath, buffer, contentType) {
  const { baseUrl, bucket, headers } = getSupabaseStorageConfig()
  const response = await fetch(
    `${baseUrl}/${bucket}/${encodeURI(storagePath)}`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: buffer
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase storage upload failed ${response.status}: ${text}`)
  }

  return storagePath
}

async function createCourseAssetRecord(asset) {
  const rows = await supabaseRequest('/course_assets', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(asset)
  })

  return rows?.[0] || null
}

export async function uploadCourseAsset(jobId, file) {
  const job = await getCourseJobById(jobId)
  if (!job) {
    throw new Error('Course job not found')
  }

  const fileName = String(file?.name || '').trim()
  const base64 = String(file?.base64 || '')
  const contentType = String(file?.type || 'application/octet-stream')

  if (!fileName || !base64) {
    throw new Error('File name and base64 content are required')
  }

  const kind = inferAssetKind(fileName, contentType)
  const role = file?.role || inferAssetRole(kind)
  assertSupportedUpload(fileName, kind)

  const buffer = Buffer.from(base64, 'base64')
  if (!buffer.length) {
    throw new Error('Uploaded file is empty')
  }

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex')
  const storagePath = [
    'courses',
    job.id,
    `${Date.now()}-${safeStorageSegment(fileName)}`
  ].join('/')

  await uploadBufferToStorage(storagePath, buffer, contentType)

  return createCourseAssetRecord({
    job_id: job.id,
    kind,
    role,
    original_name: fileName,
    mime_type: contentType,
    size_bytes: Number(file?.size || buffer.length),
    sort_order: Number(file?.sortOrder || 0),
    lesson_order: file?.lessonOrder ? Number(file.lessonOrder) : null,
    lesson_key: file?.lessonKey || null,
    storage_path: storagePath,
    checksum,
    metadata: {
      uploadedBy: 'desk',
      materialBundle: true
    }
  })
}
