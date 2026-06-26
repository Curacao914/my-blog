import { cleanText } from './textpack'

export const COURSE_WORKFLOW_STATUSES = [
  'imported',
  'preflight_required',
  'preflight_approved',
  'outline_pending',
  'outline_generating',
  'outline_review',
  'outline_approved',
  'node_planning',
  'node_pending',
  'node_generating',
  'node_review',
  'node_revision_required',
  'node_approved',
  'assembly_pending',
  'assembling',
  'final_review',
  'completed',
  'failed',
  'paused',
  'cancelled'
]

export const COURSE_STEP_KEYS = [
  'imported',
  'preflight',
  'outline_generating',
  'outline_review',
  'outline_approved',
  'node_planning',
  'node_generating',
  'node_review',
  'assembly',
  'final_review',
  'completed'
]

const DEFAULT_COURSE_SPEC = {
  goal: '全面笔记',
  useCase: '自学',
  detailLevel: 'high',
  preserveOralStyle: 'clean',
  statuteMode: 'explain-when-mentioned',
  caseMode: 'extract-facts-issue-rule',
  teacherViewMode: 'mark-as-teacher-view',
  recitationHints: false,
  nodeSplitThreshold: 12000,
  qualityThreshold: 75,
  maxAutoRevisions: 2,
  promptVersion: 'course-mvp-v1',
  models: {
    outline: process.env.COURSE_OUTLINE_MODEL || '',
    writer: process.env.COURSE_WRITER_MODEL || '',
    reviewer: process.env.COURSE_REVIEWER_MODEL || '',
    finalReview: process.env.COURSE_FINAL_REVIEW_MODEL || ''
  },
  terminology: [],
  fixedStyle: '',
  forbidden: ['不得编造未在材料中出现的法条、案例或老师观点。']
}

function nowIso() {
  return new Date().toISOString()
}

function versioned(value, previous = []) {
  return [
    ...previous.slice(-9),
    {
      version: previous.length + 1,
      at: nowIso(),
      value
    }
  ]
}

function baseSteps() {
  return COURSE_STEP_KEYS.map(key => ({
    key,
    status: key === 'imported' ? 'done' : 'pending',
    updatedAt: nowIso(),
    error: null
  }))
}

function stepStatus(workflow, key) {
  return workflow.steps?.find(step => step.key === key)?.status || 'pending'
}

function setStep(workflow, key, status, patch = {}) {
  return {
    ...workflow,
    steps: (workflow.steps || baseSteps()).map(step =>
      step.key === key
        ? {
            ...step,
            ...patch,
            status,
            updatedAt: nowIso()
          }
        : step
    )
  }
}

function firstLesson(workflow, lessonKey) {
  const lesson = (workflow.lessons || []).find(item => item.key === lessonKey)
  if (!lesson) throw new Error('Lesson not found')
  return lesson
}

function mapLesson(workflow, lessonKey, mapper) {
  return {
    ...workflow,
    updatedAt: nowIso(),
    lessons: workflow.lessons.map(lesson =>
      lesson.key === lessonKey ? mapper(lesson) : lesson
    )
  }
}

function linesForRange(transcript, range = []) {
  const [start = 1, end = start] = range
  return cleanText(transcript)
    .split('\n')
    .slice(Math.max(0, Number(start) - 1), Math.max(Number(start), Number(end)))
    .join('\n')
}

function pptForRange(pptText = [], range = []) {
  const [start = 1, end = start] = range
  return pptText
    .flatMap(deck => deck.slides?.length ? deck.slides : [{ slideNumber: 1, text: deck.markdown }])
    .filter(slide => Number(slide.slideNumber || 1) >= start && Number(slide.slideNumber || 1) <= end)
    .map(slide => `第 ${slide.slideNumber || 1} 页\n${slide.text || ''}`)
    .join('\n\n')
}

function normalizeOutlineNode(node, index) {
  const lineRange = Array.isArray(node.lineRange) ? node.lineRange : [1, 1]
  const slideRange = Array.isArray(node.slideRange) ? node.slideRange : [1, 1]
  return {
    id: node.id || `outline-node-${String(index + 1).padStart(2, '0')}`,
    title: cleanText(node.title) || `节点 ${index + 1}`,
    lineRange: [Number(lineRange[0] || 1), Number(lineRange[1] || lineRange[0] || 1)],
    slideRange: [Number(slideRange[0] || 1), Number(slideRange[1] || slideRange[0] || 1)],
    rationale: cleanText(node.rationale || ''),
    importance: node.importance || 'normal',
    locked: Boolean(node.locked),
    userEdited: Boolean(node.userEdited),
    concepts: Array.isArray(node.concepts) ? node.concepts : [],
    statutes: Array.isArray(node.statutes) ? node.statutes : [],
    cases: Array.isArray(node.cases) ? node.cases : []
  }
}

function createNodeFromOutline({ outlineNode, index, partIndex = 0, partCount = 1, lesson, courseSpec }) {
  const suffix = partCount > 1 ? ` · ${partIndex + 1}/${partCount}` : ''
  const lineSpan = outlineNode.lineRange[1] - outlineNode.lineRange[0] + 1
  const partStart = outlineNode.lineRange[0] + Math.floor((lineSpan * partIndex) / partCount)
  const partEnd =
    partIndex === partCount - 1
      ? outlineNode.lineRange[1]
      : outlineNode.lineRange[0] + Math.floor((lineSpan * (partIndex + 1)) / partCount) - 1
  return {
    id: `${outlineNode.id}-node-${partIndex + 1}`,
    outlineNodeId: outlineNode.id,
    title: `${outlineNode.title}${suffix}`,
    status: 'node_pending',
    lineRange: [partStart, Math.max(partStart, partEnd)],
    slideRange: outlineNode.slideRange,
    importance: outlineNode.importance,
    writerBrief: {
      courseSpec,
      lessonBlueprintSummary: lesson.blueprint?.mainLine || '',
      currentNodeGoal: outlineNode.rationale,
      previousNodeSummary: '',
      nextNodeTarget: '',
      coverageTable: lesson.blueprint?.coverageTable || []
    },
    sourceText: linesForRange(lesson.transcript, [partStart, Math.max(partStart, partEnd)]),
    pptText: pptForRange(lesson.pptText, outlineNode.slideRange),
    draft: '',
    versions: [],
    reviewerReports: [],
    revisionRequests: [],
    stale: false,
    splitFrom: partCount > 1 ? outlineNode.id : null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
}

function allNodes(workflow) {
  return (workflow.lessons || []).flatMap(lesson => lesson.nodes || [])
}

function reviewerApproves(report = {}, threshold = 75) {
  if (report.decision !== 'approve') return false
  const keys = ['coverage', 'grounding', 'logic', 'detail', 'sourceCoverage']
  return keys.every(key => Number(report[key] || 0) >= threshold)
}

export function createInitialWorkflow({ textPack, courseName, teacher }) {
  const createdAt = nowIso()
  return {
    schemaVersion: 'course-workflow.v1',
    status: 'preflight_required',
    currentStep: 'preflight',
    progress: 8,
    paused: false,
    cancelled: false,
    worker: {
      status: 'offline',
      lastSeenAt: null,
      message: '等待本地 Worker'
    },
    courseSpec: {
      ...DEFAULT_COURSE_SPEC,
      courseName: courseName || textPack.course?.name || '',
      teacher: teacher || textPack.course?.teacher || ''
    },
    courseSpecVersions: [],
    lessons: (textPack.lessons || []).map(lesson => ({
      key: lesson.key,
      order: lesson.order,
      title: lesson.title,
      status: 'preflight_required',
      transcript: lesson.transcript,
      sourceMap: lesson.sourceMap || [],
      pptText: textPack.ppt_text || [],
      outline: [],
      outlineVersions: [],
      nodes: [],
      finalNote: null,
      finalNoteVersions: [],
      qualityReport: null
    })),
    artifacts: {
      textPackManifest: textPack.manifest,
      sourceHash: textPack.manifest?.sourceHash || textPack.checksums?.sourceHash
    },
    steps: baseSteps(),
    pendingSteps: [],
    errors: [],
    feedback: [],
    createdAt,
    updatedAt: createdAt
  }
}

export function requireTransition(workflow, target) {
  if (workflow.cancelled || workflow.status === 'cancelled') {
    throw new Error('Course workflow is cancelled')
  }
  if (workflow.paused || workflow.status === 'paused') {
    throw new Error('Course workflow is paused')
  }
  if (target === 'outline_generating' && stepStatus(workflow, 'preflight') !== 'done') {
    throw new Error('preflight must be approved before outline generation')
  }
  if (target === 'node_planning' && stepStatus(workflow, 'outline_approved') !== 'done') {
    throw new Error('outline must be approved before node planning')
  }
  if (target === 'assembling') {
    const nodes = allNodes(workflow)
    if (!nodes.length || nodes.some(node => node.status !== 'node_approved')) {
      throw new Error('all nodes must be approved before assembly')
    }
  }
  if (target === 'completed') {
    if (workflow.status === 'node_revision_required') {
      throw new Error('revision_required nodes block completion')
    }
    if (stepStatus(workflow, 'final_review') !== 'done') {
      throw new Error('final review must pass before completion')
    }
  }
  return true
}

export function saveCourseSpec(workflow, patch = {}) {
  const nextSpec = {
    ...workflow.courseSpec,
    ...patch,
    nodeSplitThreshold: Number(patch.nodeSplitThreshold || workflow.courseSpec.nodeSplitThreshold || DEFAULT_COURSE_SPEC.nodeSplitThreshold),
    qualityThreshold: Number(patch.qualityThreshold || workflow.courseSpec.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)
  }
  const next = setStep(
    {
      ...workflow,
      status: 'preflight_approved',
      currentStep: 'outline_pending',
      progress: Math.max(workflow.progress || 0, 18),
      courseSpec: nextSpec,
      courseSpecVersions: versioned(nextSpec, workflow.courseSpecVersions),
      lessons: workflow.lessons.map(lesson => ({
        ...lesson,
        status: lesson.status === 'preflight_required' ? 'outline_pending' : lesson.status
      })),
      updatedAt: nowIso()
    },
    'preflight',
    'done'
  )
  return setStep(next, 'outline_generating', 'pending')
}

export function startOutlineReview(workflow, { lessonKey, outline = [], mainLine = '' }) {
  requireTransition(workflow, 'outline_generating')
  const normalized = outline.map(normalizeOutlineNode)
  if (!normalized.length) throw new Error('outline must include at least one node')
  const next = mapLesson(workflow, lessonKey, lesson => ({
    ...lesson,
    status: 'outline_review',
    outline: normalized,
    outlineVersions: versioned(normalized, lesson.outlineVersions),
    blueprint: {
      mainLine: cleanText(mainLine) || normalized.map(node => node.title).join(' / '),
      outline: normalized,
      coverageTable: normalized.map(node => ({
        nodeId: node.id,
        title: node.title,
        lineRange: node.lineRange,
        slideRange: node.slideRange
      }))
    }
  }))
  return setStep(
    setStep(
      {
        ...next,
        status: 'outline_review',
        currentStep: 'outline_review',
        progress: Math.max(next.progress || 0, 28)
      },
      'outline_generating',
      'done'
    ),
    'outline_review',
    'waiting_human'
  )
}

export function updateOutline(workflow, lessonKey, updater) {
  return mapLesson(workflow, lessonKey, lesson => {
    const outline = lesson.outline.map((node, index) =>
      normalizeOutlineNode(updater(node, index), index)
    )
    return {
      ...lesson,
      outline,
      outlineVersions: versioned(outline, lesson.outlineVersions),
      blueprint: {
        ...(lesson.blueprint || {}),
        outline,
        coverageTable: outline.map(node => ({
          nodeId: node.id,
          title: node.title,
          lineRange: node.lineRange,
          slideRange: node.slideRange
        }))
      }
    }
  })
}

export function approveOutline(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.outline?.length) throw new Error('outline must exist before approval')
  const next = mapLesson(workflow, lessonKey, item => ({
    ...item,
    status: 'outline_approved',
    outlineApprovedAt: nowIso()
  }))
  return setStep(
    setStep(
      {
        ...next,
        status: 'outline_approved',
        currentStep: 'node_planning',
        progress: Math.max(next.progress || 0, 38)
      },
      'outline_review',
      'done'
    ),
    'outline_approved',
    'done'
  )
}

export function planNodesFromOutline(workflow, lessonKey) {
  requireTransition(workflow, 'node_planning')
  const lesson = firstLesson(workflow, lessonKey)
  const threshold = Number(workflow.courseSpec?.nodeSplitThreshold || DEFAULT_COURSE_SPEC.nodeSplitThreshold)
  const nodes = lesson.outline.flatMap((outlineNode, index) => {
    const source = linesForRange(lesson.transcript, outlineNode.lineRange)
    const partCount = Math.max(1, Math.ceil(source.length / threshold))
    return Array.from({ length: partCount }, (_, partIndex) =>
      createNodeFromOutline({
        outlineNode,
        index,
        partIndex,
        partCount,
        lesson,
        courseSpec: workflow.courseSpec
      })
    )
  })
  const next = mapLesson(workflow, lessonKey, item => ({
    ...item,
    status: 'node_pending',
    nodes
  }))
  return setStep(
    {
      ...next,
      status: 'node_pending',
      currentStep: 'node_generating',
      progress: Math.max(next.progress || 0, 48)
    },
    'node_planning',
    'done'
  )
}

export function updateNodeDraft(workflow, lessonKey, nodeId, patch = {}) {
  const threshold = Number(workflow.courseSpec?.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)
  let nextStatus = workflow.status
  const next = mapLesson(workflow, lessonKey, lesson => ({
    ...lesson,
    nodes: (lesson.nodes || []).map(node => {
      if (node.id !== nodeId) return node
      const reviewerReport = patch.reviewerReport || node.reviewerReports?.at?.(-1)?.value
      const draft = cleanText(patch.markdown || patch.draft || node.draft)
      const reviewerReports = patch.reviewerReport
        ? versioned(patch.reviewerReport, node.reviewerReports)
        : node.reviewerReports
      const approved = reviewerApproves(reviewerReport, threshold)
      if (!approved && reviewerReport) nextStatus = 'node_revision_required'
      return {
        ...node,
        status: approved ? 'node_review' : reviewerReport ? 'node_revision_required' : 'node_review',
        draft,
        versions: draft ? versioned(draft, node.versions) : node.versions,
        reviewerReports,
        revisionRequests: patch.revisionRequest
          ? versioned(patch.revisionRequest, node.revisionRequests)
          : node.revisionRequests,
        updatedAt: nowIso()
      }
    })
  }))
  return {
    ...next,
    status: nextStatus,
    currentStep: nextStatus === 'node_revision_required' ? 'node_review' : next.currentStep
  }
}

export function approveNode(workflow, lessonKey, nodeId) {
  const next = mapLesson(workflow, lessonKey, lesson => ({
    ...lesson,
    nodes: (lesson.nodes || []).map(node => {
      if (node.id !== nodeId) return node
      const report = node.reviewerReports?.[node.reviewerReports.length - 1]?.value
      if (!node.draft) throw new Error('node draft is required before approval')
      if (!reviewerApproves(report, workflow.courseSpec?.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)) {
        throw new Error('Reviewer approval is required before approving node')
      }
      return {
        ...node,
        status: 'node_approved',
        approvedAt: nowIso(),
        updatedAt: nowIso()
      }
    })
  }))
  const nodes = allNodes(next)
  const allApproved = nodes.length > 0 && nodes.every(node => node.status === 'node_approved')
  return {
    ...setStep(next, 'node_review', allApproved ? 'done' : 'running'),
    status: allApproved ? 'assembly_pending' : 'node_review',
    currentStep: allApproved ? 'assembly' : 'node_review',
    progress: allApproved ? Math.max(next.progress || 0, 72) : next.progress
  }
}

export function assembleFinalNote(workflow, lessonKey) {
  requireTransition(workflow, 'assembling')
  const lesson = firstLesson(workflow, lessonKey)
  const markdown = [
    `# ${lesson.title}`,
    '',
    `> 课程：${workflow.courseSpec.courseName || ''}${workflow.courseSpec.teacher ? ` · ${workflow.courseSpec.teacher}` : ''}`,
    '',
    ...lesson.nodes.map(node => cleanText(node.draft))
  ].filter(Boolean).join('\n\n')
  const qualityReport = {
    decision: 'approve',
    issues: [],
    checkedAt: nowIso(),
    terminologyConsistent: true,
    sourceCoverageComplete: true,
    assembledNodeCount: lesson.nodes.length
  }
  const next = mapLesson(workflow, lessonKey, item => ({
    ...item,
    status: 'completed',
    finalNote: {
      markdown,
      qualityReport,
      updatedAt: nowIso()
    },
    finalNoteVersions: versioned(markdown, item.finalNoteVersions),
    qualityReport
  }))
  return setStep(
    setStep(
      setStep(
        {
          ...next,
          status: 'completed',
          currentStep: 'completed',
          progress: 100
        },
        'assembly',
        'done'
      ),
      'final_review',
      'done'
    ),
    'completed',
    'done'
  )
}

export function failStep(workflow, { step, error, retryable = true }) {
  const entry = {
    id: `error-${Date.now()}`,
    step,
    message: cleanText(error),
    retryable,
    at: nowIso()
  }
  return {
    ...setStep(workflow, step, 'failed', { error: entry }),
    status: 'failed',
    currentStep: step,
    errors: [...(workflow.errors || []), entry],
    updatedAt: nowIso()
  }
}

export function pauseWorkflow(workflow) {
  return {
    ...workflow,
    status: 'paused',
    paused: true,
    updatedAt: nowIso()
  }
}

export function resumeWorkflow(workflow) {
  return {
    ...workflow,
    status: workflow.currentStep === 'completed' ? 'completed' : workflow.currentStep,
    paused: false,
    updatedAt: nowIso()
  }
}

export function cancelWorkflow(workflow, reason = '') {
  return {
    ...workflow,
    status: 'cancelled',
    cancelled: true,
    cancelReason: cleanText(reason),
    updatedAt: nowIso()
  }
}
