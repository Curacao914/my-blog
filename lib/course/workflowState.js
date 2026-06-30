import { cleanText } from './textpack'

export const COURSE_WORKFLOW_STATUSES = [
  'preflight_required', 'outline_pending', 'outline_generating', 'outline_review', 'outline_approved',
  'node_planning', 'node_pending', 'node_generating', 'node_review', 'node_revision_required', 'node_human_review',
  'assembly_pending', 'assembling', 'final_revision_required', 'final_review', 'final_review_human', 'note_removed', 'completed', 'failed', 'paused', 'cancelled'
]

export const COURSE_STEP_KEYS = [
  'imported', 'preflight', 'outline_generating', 'outline_review', 'outline_approved',
  'node_planning', 'node_generating', 'node_review', 'assembly', 'final_review', 'completed'
]

const DEFAULT_COURSE_SPEC = {
  goal: '全面笔记', useCase: '自学', detailLevel: 'high', preserveOralStyle: 'clean',
  statuteMode: 'explain-when-mentioned', caseMode: 'extract-facts-issue-rule', teacherViewMode: 'mark-as-teacher-view',
  recitationHints: false, nodeSplitThreshold: 12000, nodeSplitLineThreshold: 200,
  qualityThreshold: 75, maxAutoRevisions: 2, maxFinalAutoRevisions: 1, maxTechnicalRetries: 2, reviewConcurrency: 2, autoApproveOutline: true, promptVersion: 'course-controlled-v4-pipeline',
  models: {
    outline: process.env.COURSE_OUTLINE_MODEL || '', writer: process.env.COURSE_WRITER_MODEL || '',
    reviewer: process.env.COURSE_REVIEWER_MODEL || '',
    revision: process.env.COURSE_REVISION_MODEL || process.env.COURSE_WRITER_MODEL || '',
    finalReview: process.env.COURSE_FINAL_REVIEW_MODEL || ''
  },
  terminology: [], fixedStyle: '', forbidden: ['不得编造未在材料中出现的法条、案例或老师观点。']
}

const nowIso = () => new Date().toISOString()

function versioned(value, previous = [], metadata = {}) {
  return [...(previous || []).slice(-19), { version: (previous || []).length + 1, at: nowIso(), value, ...metadata }]
}

function baseSteps() {
  return COURSE_STEP_KEYS.map(key => ({ key, status: key === 'imported' ? 'done' : 'pending', updatedAt: nowIso(), error: null }))
}

function resetStepsForNextLesson(steps = []) {
  return steps.map(step => ({ ...step, status: ['imported', 'preflight'].includes(step.key) ? 'done' : 'pending', error: null, updatedAt: nowIso() }))
}

function stepStatus(workflow, key) {
  return workflow.steps?.find(step => step.key === key)?.status || 'pending'
}

function setStep(workflow, key, status, patch = {}) {
  return {
    ...workflow,
    steps: (workflow.steps || baseSteps()).map(step => step.key === key ? { ...step, ...patch, status, updatedAt: nowIso() } : step)
  }
}

function firstLesson(workflow, lessonKey) {
  const lesson = (workflow.lessons || []).find(item => item.key === lessonKey)
  if (!lesson) throw new Error('Lesson not found')
  return lesson
}

function mapLesson(workflow, lessonKey, mapper) {
  return { ...workflow, updatedAt: nowIso(), lessons: workflow.lessons.map(lesson => lesson.key === lessonKey ? mapper(lesson) : lesson) }
}

function linesForRange(transcript, range = []) {
  const [start = 1, end = start] = range
  return cleanText(transcript).split('\n').slice(Math.max(0, Number(start) - 1), Math.max(Number(start), Number(end))).join('\n')
}

function pptForRange(pptText = [], range = []) {
  const [start = 1, end = start] = range
  return pptText.flatMap(deck => deck.slides?.length ? deck.slides : [{ slideNumber: 1, text: deck.markdown }])
    .filter(slide => Number(slide.slideNumber || 1) >= start && Number(slide.slideNumber || 1) <= end)
    .map(slide => `第 ${slide.slideNumber || 1} 页\n${slide.text || ''}`).join('\n\n')
}

function normalizeOutlineNode(node, index) {
  const lineRange = Array.isArray(node.lineRange) ? node.lineRange : [1, 1]
  const slideRange = Array.isArray(node.slideRange) ? node.slideRange : [1, 1]
  const startLine = Math.max(1, Number(lineRange[0] || 1))
  const endLine = Math.max(startLine, Number(lineRange[1] || startLine))
  const startSlide = Math.max(1, Number(slideRange[0] || 1))
  const endSlide = Math.max(startSlide, Number(slideRange[1] || startSlide))
  return {
    id: node.id || `outline-node-${String(index + 1).padStart(2, '0')}`,
    title: cleanText(node.title) || `节点 ${index + 1}`,
    lineRange: [startLine, endLine], slideRange: [startSlide, endSlide],
    rationale: cleanText(node.rationale || ''),
    importance: ['high', 'normal', 'low'].includes(node.importance) ? node.importance : 'normal',
    locked: Boolean(node.locked), userEdited: Boolean(node.userEdited),
    concepts: Array.isArray(node.concepts) ? node.concepts : [],
    statutes: Array.isArray(node.statutes) ? node.statutes : [],
    cases: Array.isArray(node.cases) ? node.cases : [],
    writerBrief: node.writerBrief || null, keySignals: Array.isArray(node.keySignals) ? node.keySignals : []
  }
}

function validateOutlineCoverage(lesson, outline) {
  const lineCount = Math.max(1, cleanText(lesson.transcript || '').split('\n').filter(Boolean).length)
  const ranges = outline.map(node => node.lineRange).sort((a, b) => a[0] - b[0])
  ranges.forEach(([start, end], index) => {
    if (start < 1 || end < start || end > lineCount) throw new Error(`outline node ${index + 1} line range is outside the transcript`)
  })
  if (ranges[0]?.[0] !== 1) throw new Error('outline must start from transcript line 1')
  let coveredUntil = 0
  ranges.forEach(([start, end]) => {
    if (start > coveredUntil + 1) throw new Error(`outline leaves transcript lines ${coveredUntil + 1}-${start - 1} uncovered`)
    coveredUntil = Math.max(coveredUntil, end)
  })
  if (coveredUntil < lineCount) throw new Error(`outline leaves transcript lines ${coveredUntil + 1}-${lineCount} uncovered`)
  return outline
}

function createNodeFromOutline({ outlineNode, partIndex = 0, partCount = 1, lesson, courseSpec }) {
  const suffix = partCount > 1 ? ` · ${partIndex + 1}/${partCount}` : ''
  const lineSpan = outlineNode.lineRange[1] - outlineNode.lineRange[0] + 1
  const partStart = outlineNode.lineRange[0] + Math.floor((lineSpan * partIndex) / partCount)
  const partEnd = partIndex === partCount - 1 ? outlineNode.lineRange[1] : outlineNode.lineRange[0] + Math.floor((lineSpan * (partIndex + 1)) / partCount) - 1
  const safeEnd = Math.max(partStart, partEnd)
  return {
    id: `${outlineNode.id}-node-${partIndex + 1}`, outlineNodeId: outlineNode.id,
    title: `${outlineNode.title}${suffix}`, status: 'node_pending', lineRange: [partStart, safeEnd], slideRange: outlineNode.slideRange,
    importance: outlineNode.importance, concepts: outlineNode.concepts, statutes: outlineNode.statutes, cases: outlineNode.cases,
    writerBrief: {
      courseSpec, lessonBlueprintSummary: lesson.blueprint?.mainLine || '',
      currentNodeGoal: outlineNode.writerBrief || outlineNode.rationale,
      previousNodeSummary: '', nextNodeTarget: '', coverageTable: lesson.blueprint?.coverageTable || []
    },
    sourceText: linesForRange(lesson.transcript, [partStart, safeEnd]), pptText: pptForRange(lesson.pptText, outlineNode.slideRange),
    draft: '', versions: [], reviewerReports: [], revisionRequests: [], revisionCount: 0,
    reviewRequired: false, reviewDecision: null, stale: false, splitFrom: partCount > 1 ? outlineNode.id : null,
    taskFailures: { writer: 0, reviewer: 0, revision: 0 }, taskError: null, humanReviewRequired: false, manualRevisionRequested: false,
    blockedByNodeIds: [], blocksDownstream: false, consistencyRequests: [],
    createdAt: nowIso(), updatedAt: nowIso()
  }
}

const allNodes = workflow => (workflow.lessons || []).flatMap(lesson => lesson.nodes || [])

function scoresMeetThreshold(report = {}, threshold = 75) {
  const floor = Math.max(45, Number(threshold || 75) - 20)
  return ['coverage', 'grounding', 'logic', 'detail', 'sourceCoverage'].every(key => Number(report[key] || 0) >= floor)
}

function normalizeIssue(issue, index = 0) {
  if (typeof issue === 'string') return { id: `issue-${index + 1}`, type: 'review_note', severity: 'important', message: cleanText(issue), impact: 'local', requiresHuman: false }
  const rawSeverity = cleanText(issue?.severity || '').toLowerCase()
  const severity = ['blocking', 'high'].includes(rawSeverity) ? 'blocking'
    : ['suggestion', 'low'].includes(rawSeverity) ? 'suggestion' : 'important'
  return {
    ...issue,
    id: issue?.id || `issue-${index + 1}`,
    type: cleanText(issue?.type || 'review_note'),
    severity,
    message: cleanText(issue?.message || issue?.detail || issue?.type || ''),
    impact: issue?.impact === 'downstream' ? 'downstream' : 'local',
    requiresHuman: Boolean(issue?.requiresHuman)
  }
}

function blockingIssues(report = {}) {
  return (report.issues || []).filter(issue => issue.severity === 'blocking')
}

function humanIssues(report = {}) {
  return (report.issues || []).filter(issue => issue.requiresHuman)
}

function issuesAffectDownstream(report = {}) {
  return (report.issues || []).some(issue => (issue.severity === 'blocking' || issue.requiresHuman) && issue.impact === 'downstream')
}

function releaseDownstreamBlocks(nodes, sourceNodeId) {
  return (nodes || []).map(node => {
    const blockers = (node.blockedByNodeIds || []).filter(id => id !== sourceNodeId)
    if (blockers.length === (node.blockedByNodeIds || []).length) return node
    return {
      ...node,
      blockedByNodeIds: blockers,
      status: blockers.length || !node.draft ? node.status : 'node_review',
      reviewRequired: blockers.length ? node.reviewRequired : true,
      reviewDecision: blockers.length ? node.reviewDecision : null,
      updatedAt: nowIso()
    }
  })
}

function normalizedReviewDecision(report = {}, threshold = 75) {
  if (report.requestedDecision === 'human_review' || report.decision === 'human_review' || humanIssues(report).length) return 'human_review'
  if (blockingIssues(report).length) return 'revise'
  if (!scoresMeetThreshold(report, threshold)) return 'revise'
  return 'approve'
}

function reviewerApproves(report = {}, threshold = 75) {
  return normalizedReviewDecision(report, threshold) === 'approve'
}

function normalizeReviewReport(report = {}, draftVersion = 0) {
  const requestedDecision = ['approve', 'revise', 'human_review'].includes(report.decision) ? report.decision : 'human_review'
  const issues = (Array.isArray(report.issues) ? report.issues : []).map(normalizeIssue).filter(issue => issue.message)
  return {
    coverage: Number(report.coverage ?? 0), grounding: Number(report.grounding ?? 0), logic: Number(report.logic ?? 0),
    detail: Number(report.detail ?? 0), sourceCoverage: Number(report.sourceCoverage ?? 0),
    summary: cleanText(report.summary || ''), issues, requestedDecision, decision: requestedDecision,
    reviewedDraftVersion: Number(report.reviewedDraftVersion || draftVersion), checkedAt: report.checkedAt || nowIso(), trace: report.trace || null
  }
}

function stageFraction(status) {
  return ({ preflight_required: .05, outline_pending: .12, outline_generating: .18, outline_review: .28, outline_approved: .36,
    node_planning: .42, node_pending: .5, node_generating: .56, node_review: .66, node_revision_required: .62, node_human_review: .68,
    assembly_pending: .76, assembling: .8, final_revision_required: .86, final_review: .88, final_review_human: .9, note_removed: .9, completed: 1 })[status] ?? 0
}

function deriveProgress(workflow) {
  const lessons = workflow.lessons || []
  if (!lessons.length) return workflow.progress || 0
  const completed = lessons.filter(lesson => lesson.status === 'completed').length
  const active = lessons.find(lesson => lesson.status !== 'completed')
  return Math.round(((completed + (active ? stageFraction(active.status) : 0)) / lessons.length) * 100)
}

export function getActiveLesson(workflow) {
  const lessons = [...(workflow?.lessons || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  return lessons.find(lesson => lesson.status !== 'completed') || lessons.at(-1) || null
}

const withDerivedProgress = workflow => ({ ...workflow, progress: deriveProgress(workflow), updatedAt: nowIso() })

function lessonNodeStatus(lesson) {
  const nodes = lesson.nodes || []
  if (!nodes.length) return 'node_pending'
  if (nodes.every(node => node.status === 'node_approved')) return 'assembly_pending'
  if (nodes.some(node => node.status === 'node_revision_required')) return 'node_revision_required'
  if (nodes.some(node => node.status === 'node_pending')) return 'node_pending'
  if (nodes.some(node => node.status === 'node_review')) return 'node_review'
  if (nodes.some(node => ['node_human_review', 'node_failed'].includes(node.status))) return 'node_human_review'
  return 'node_review'
}

export function createInitialWorkflow({ textPack, courseName, teacher }) {
  const createdAt = nowIso()
  return {
    schemaVersion: 'course-workflow.v2', status: 'preflight_required', currentStep: 'preflight', progress: 0,
    paused: false, cancelled: false, resumeStatus: null,
    worker: { status: 'offline', lastSeenAt: null, message: '在线课程处理尚未开始' },
    courseSpec: { ...DEFAULT_COURSE_SPEC, courseName: courseName || textPack.course?.name || '', teacher: teacher || textPack.course?.teacher || '' },
    courseSpecVersions: [],
    lessons: (textPack.lessons || []).map(lesson => ({
      key: lesson.key, order: lesson.order, title: lesson.title, status: 'preflight_required', transcript: lesson.transcript,
      sourceMap: lesson.sourceMap || [],
      pptText: [
        ...(textPack.ppt_text || []).filter(deck => !deck.lessonOrder || Number(deck.lessonOrder) === Number(lesson.order)),
        ...(lesson.materials || []).map((material, index) => ({
          key: `${lesson.key}-material-${index + 1}`, title: material.title || `补充材料 ${index + 1}`,
          sourceFile: material.sourceFile, kind: material.kind, role: material.role, slideCount: 1,
          markdown: material.text || '', slides: [{ slideNumber: 1, text: material.text || '' }], warnings: material.warnings || []
        }))
      ],
      outline: [], outlineVersions: [], outlineStale: false, nodes: [], finalNote: null,
      finalNoteVersions: [], finalReviewReports: [], finalRevisionRequests: [], finalRevisionCount: 0, finalReviewAttention: null, qualityReport: null, noteDeletion: null, notePurgedAt: null
    })),
    artifacts: { textPackManifest: textPack.manifest, sourceHash: textPack.manifest?.sourceHash || textPack.checksums?.sourceHash },
    steps: baseSteps(), pendingSteps: [], appliedTaskKeys: [], taskLease: null, taskLeases: [], errors: [], activeErrorId: null, feedback: [], createdAt, updatedAt: createdAt
  }
}


export function mergeTextPackIntoWorkflow(workflow, textPack) {
  const preflightDone = stepStatus(workflow, 'preflight') === 'done'
  const incoming = createInitialWorkflow({
    textPack,
    courseName: workflow.courseSpec?.courseName || textPack.course?.name || '',
    teacher: workflow.courseSpec?.teacher || textPack.course?.teacher || ''
  })
  const incomingByKey = new Map(incoming.lessons.map(lesson => [lesson.key, lesson]))
  const existingKeys = new Set((workflow.lessons || []).map(lesson => lesson.key))
  const affected = new Set()

  const lessons = (workflow.lessons || []).map(existing => {
    const addition = incomingByKey.get(existing.key)
    if (!addition) return existing
    affected.add(existing.key)
    const offset = cleanText(existing.transcript).split('\n').filter(Boolean).length
    const additionText = cleanText(addition.transcript)
    const transcript = [cleanText(existing.transcript), additionText ? `【补充资料】\n${additionText}` : ''].filter(Boolean).join('\n')
    const sourceMap = [
      ...(existing.sourceMap || []),
      ...(addition.sourceMap || []).map(item => ({ ...item, line: Number(item.line || 0) + offset + (additionText ? 1 : 0) }))
    ]
    return {
      ...existing,
      status: preflightDone ? 'outline_pending' : 'preflight_required',
      transcript,
      sourceMap,
      pptText: [...(existing.pptText || []), ...(addition.pptText || [])],
      outlineStale: Boolean(existing.outline?.length),
      nodes: [],
      finalNote: null,
      finalReviewReports: [],
      finalRevisionRequests: [],
      finalRevisionCount: 0,
      finalReviewAttention: null,
      qualityReport: null,
      updatedAt: nowIso()
    }
  })

  incoming.lessons.forEach(lesson => {
    if (existingKeys.has(lesson.key)) return
    affected.add(lesson.key)
    lessons.push({ ...lesson, status: preflightDone ? 'outline_pending' : 'preflight_required' })
  })
  lessons.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))

  let next = {
    ...workflow,
    lessons,
    paused: false,
    cancelled: false,
    taskLease: null,
    taskLeases: [],
    status: preflightDone ? 'outline_pending' : 'preflight_required',
    currentStep: preflightDone ? 'outline_generating' : 'preflight',
    errors: [],
    feedback: [
      ...(workflow.feedback || []).slice(-49),
      { at: nowIso(), type: 'materials-supplemented', lessonKeys: [...affected] }
    ],
    updatedAt: nowIso()
  }
  next.steps = resetStepsForNextLesson(workflow.steps || baseSteps())
  if (!preflightDone) next.steps = next.steps.map(step => ({ ...step, status: step.key === 'imported' ? 'done' : 'pending' }))
  return withDerivedProgress(next)
}

export function requireTransition(workflow, target) {
  if (workflow.cancelled || workflow.status === 'cancelled') throw new Error('Course workflow is cancelled')
  if (workflow.paused || workflow.status === 'paused') throw new Error('Course workflow is paused')
  if (target === 'outline_generating' && stepStatus(workflow, 'preflight') !== 'done') throw new Error('preflight must be approved before outline generation')
  if (target === 'node_planning' && stepStatus(workflow, 'outline_approved') !== 'done') throw new Error('outline must be approved before node planning')
  if (target === 'assembling') {
    const nodes = allNodes(workflow)
    if (!nodes.length || nodes.some(node => node.status !== 'node_approved')) throw new Error('all nodes must be approved before assembly')
  }
  if (target === 'completed' && stepStatus(workflow, 'final_review') !== 'done') throw new Error('final review must pass before completion')
  return true
}

export function saveCourseSpec(workflow, patch = {}) {
  const nextSpec = {
    ...workflow.courseSpec, ...patch,
    nodeSplitThreshold: Number(patch.nodeSplitThreshold ?? workflow.courseSpec.nodeSplitThreshold ?? DEFAULT_COURSE_SPEC.nodeSplitThreshold),
    nodeSplitLineThreshold: Number(patch.nodeSplitLineThreshold ?? workflow.courseSpec.nodeSplitLineThreshold ?? DEFAULT_COURSE_SPEC.nodeSplitLineThreshold),
    qualityThreshold: Number(patch.qualityThreshold ?? workflow.courseSpec.qualityThreshold ?? DEFAULT_COURSE_SPEC.qualityThreshold),
    maxAutoRevisions: Number(patch.maxAutoRevisions ?? workflow.courseSpec.maxAutoRevisions ?? DEFAULT_COURSE_SPEC.maxAutoRevisions),
    maxFinalAutoRevisions: Number(patch.maxFinalAutoRevisions ?? workflow.courseSpec.maxFinalAutoRevisions ?? DEFAULT_COURSE_SPEC.maxFinalAutoRevisions),
    maxTechnicalRetries: Number(patch.maxTechnicalRetries ?? workflow.courseSpec.maxTechnicalRetries ?? DEFAULT_COURSE_SPEC.maxTechnicalRetries),
    reviewConcurrency: Math.min(4, Math.max(1, Number(patch.reviewConcurrency ?? workflow.courseSpec.reviewConcurrency ?? DEFAULT_COURSE_SPEC.reviewConcurrency)))
  }
  const changed = JSON.stringify(nextSpec) !== JSON.stringify(workflow.courseSpec || {})
  const generated = (workflow.lessons || []).some(lesson => lesson.outline?.length || lesson.nodes?.length || lesson.finalNote?.markdown)
  const lessons = workflow.lessons.map(lesson => {
    if (lesson.status === 'preflight_required') return { ...lesson, status: 'outline_pending' }
    if (!changed || !generated) return lesson
    return { ...lesson, status: 'outline_pending', outlineStale: Boolean(lesson.outline?.length), nodes: (lesson.nodes || []).map(node => ({ ...node, stale: true })), finalNote: lesson.finalNote ? { ...lesson.finalNote, stale: true } : null }
  })
  const next = setStep({
    ...workflow, status: 'outline_pending', currentStep: 'outline_generating', courseSpec: nextSpec,
    courseSpecVersions: changed ? versioned(nextSpec, workflow.courseSpecVersions, { source: 'user' }) : workflow.courseSpecVersions,
    lessons, updatedAt: nowIso()
  }, 'preflight', 'done')
  return withDerivedProgress(setStep(next, 'outline_generating', 'pending'))
}

export function startOutlineReview(workflow, { lessonKey, outline = [], mainLine = '', trace = null }) {
  requireTransition(workflow, 'outline_generating')
  const normalized = outline.map(normalizeOutlineNode)
  if (!normalized.length) throw new Error('outline must include at least one node')
  validateOutlineCoverage(firstLesson(workflow, lessonKey), normalized)
  const next = mapLesson(workflow, lessonKey, lesson => ({
    ...lesson, status: 'outline_review', outline: normalized, outlineStale: false,
    outlineVersions: versioned(normalized, lesson.outlineVersions, { source: trace ? 'worker' : 'user', trace }),
    blueprint: { mainLine: cleanText(mainLine) || normalized.map(node => node.title).join(' / '), outline: normalized,
      coverageTable: normalized.map(node => ({ nodeId: node.id, title: node.title, lineRange: node.lineRange, slideRange: node.slideRange })) }
  }))
  return withDerivedProgress(setStep(setStep({ ...next, status: 'outline_review', currentStep: 'outline_review' }, 'outline_generating', 'done'), 'outline_review', 'waiting_human'))
}

export function updateOutline(workflow, lessonKey, updater) {
  return withDerivedProgress(mapLesson(workflow, lessonKey, lesson => {
    const outline = lesson.outline.map((node, index) => normalizeOutlineNode(updater(node, index), index))
    return { ...lesson, outline, outlineVersions: versioned(outline, lesson.outlineVersions, { source: 'user' }),
      blueprint: { ...(lesson.blueprint || {}), outline, coverageTable: outline.map(node => ({ nodeId: node.id, title: node.title, lineRange: node.lineRange, slideRange: node.slideRange })) } }
  }))
}

export function replaceOutline(workflow, lessonKey, outline = []) {
  const lesson = firstLesson(workflow, lessonKey)
  if (lesson.status !== 'outline_review') throw new Error('outline can only be edited while waiting for approval')
  const normalized = outline.map(normalizeOutlineNode)
  if (!normalized.length) throw new Error('outline must include at least one node')
  validateOutlineCoverage(lesson, normalized)
  return withDerivedProgress(mapLesson(workflow, lessonKey, item => ({
    ...item, outline: normalized, outlineVersions: versioned(normalized, item.outlineVersions, { source: 'user' }),
    blueprint: { ...(item.blueprint || {}), outline: normalized, coverageTable: normalized.map(node => ({ nodeId: node.id, title: node.title, lineRange: node.lineRange, slideRange: node.slideRange })) }
  })))
}

export function approveOutline(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (lesson.status !== 'outline_review') throw new Error('outline is not waiting for approval')
  if (!lesson.outline?.length) throw new Error('outline must exist before approval')
  const next = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'outline_approved', outlineApprovedAt: nowIso() }))
  return withDerivedProgress(setStep(setStep({ ...next, status: 'outline_approved', currentStep: 'node_planning' }, 'outline_review', 'done'), 'outline_approved', 'done'))
}

export function planNodesFromOutline(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (lesson.status !== 'outline_approved') throw new Error('outline must be approved before node planning')
  const charThreshold = Math.max(500, Number(workflow.courseSpec?.nodeSplitThreshold || DEFAULT_COURSE_SPEC.nodeSplitThreshold))
  const lineThreshold = Math.max(20, Number(workflow.courseSpec?.nodeSplitLineThreshold || DEFAULT_COURSE_SPEC.nodeSplitLineThreshold))
  const nodes = lesson.outline.flatMap(outlineNode => {
    const source = linesForRange(lesson.transcript, outlineNode.lineRange)
    const lineSpan = outlineNode.lineRange[1] - outlineNode.lineRange[0] + 1
    const partCount = Math.max(1, Math.ceil(source.length / charThreshold), Math.ceil(lineSpan / lineThreshold))
    return Array.from({ length: partCount }, (_, partIndex) => createNodeFromOutline({ outlineNode, partIndex, partCount, lesson, courseSpec: workflow.courseSpec }))
  })
  const next = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'node_pending', nodes }))
  return withDerivedProgress(setStep({ ...next, status: 'node_pending', currentStep: 'node_generating' }, 'node_planning', 'done'))
}

export function saveNodeDraft(workflow, lessonKey, nodeId, markdown, { source = 'user', trace = null } = {}) {
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => {
    const nodes = (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    const draft = cleanText(markdown)
    if (!draft) throw new Error('node draft is required')
    const changed = draft !== node.draft
    return { ...node, status: 'node_review', draft,
      versions: changed ? versioned(draft, node.versions, { source, trace }) : node.versions,
      reviewRequired: changed || !node.reviewerReports?.length, reviewDecision: changed ? null : node.reviewDecision,
      revisionCount: source === 'revision' && changed ? Number(node.revisionCount || 0) + 1 : Number(node.revisionCount || 0),
      taskFailures: source === 'revision' ? { ...(node.taskFailures || {}), revision: 0 } : source === 'writer' ? { ...(node.taskFailures || {}), writer: 0 } : node.taskFailures,
      humanReviewRequired: false, manualRevisionRequested: source === 'revision' ? false : Boolean(node.manualRevisionRequested), taskError: null, stale: false, updatedAt: nowIso() }
    })
    return { ...lesson, nodes, status: lessonNodeStatus({ ...lesson, nodes }) }
  })
  if (!found) throw new Error('Node not found')
  const lesson = firstLesson(next, lessonKey)
  const status = lesson.status
  return withDerivedProgress({ ...next, status, currentStep: status === 'node_pending' ? 'node_generating' : 'node_review' })
}

export function applyNodeReview(workflow, lessonKey, nodeId, report = {}, { trace = null } = {}) {
  const threshold = Number(workflow.courseSpec?.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)
  let found = false
  let decision = 'human_review'
  const next = mapLesson(workflow, lessonKey, lesson => {
    const targetIndex = (lesson.nodes || []).findIndex(node => node.id === nodeId)
    let downstreamImpact = false
    let nodes = (lesson.nodes || []).map(node => {
      if (node.id !== nodeId) return node
      found = true
      if (!node.draft) throw new Error('node draft is required before review')
      const normalized = normalizeReviewReport({ ...report, trace }, node.versions?.length || 0)
      if (Number(normalized.reviewedDraftVersion || 0) !== Number(node.versions?.length || 0)) {
        return { ...node, reviewRequired: true, taskError: null, updatedAt: nowIso() }
      }
      decision = normalizedReviewDecision(normalized, threshold)
      const autoRevisionExhausted = decision === 'revise' && Number(node.revisionCount || 0) >= Number(workflow.courseSpec?.maxAutoRevisions || DEFAULT_COURSE_SPEC.maxAutoRevisions)
      if (autoRevisionExhausted) decision = 'human_review'
      const finalReport = { ...normalized, decision, autoRevisionExhausted }
      downstreamImpact = decision !== 'approve' && issuesAffectDownstream(finalReport)
      const base = {
        ...node,
        reviewerReports: versioned(finalReport, node.reviewerReports, { source: 'worker', trace }),
        reviewRequired: false,
        reviewDecision: decision,
        taskError: null,
        taskFailures: { ...(node.taskFailures || {}), reviewer: 0 },
        blocksDownstream: downstreamImpact,
        updatedAt: nowIso()
      }
      if (decision === 'approve') return { ...base, status: 'node_approved', approvedAt: nowIso(), humanReviewRequired: false, blocksDownstream: false }
      if (decision === 'human_review') return { ...base, status: 'node_human_review', humanReviewRequired: true }
      return {
        ...base,
        status: 'node_revision_required',
        humanReviewRequired: false,
        revisionRequests: versioned({
          message: blockingIssues(finalReport).map(issue => issue.message).join('；') || '审查发现需要修正的实质问题。',
          issues: blockingIssues(finalReport),
          source: 'reviewer'
        }, node.revisionRequests, { source: 'reviewer' })
      }
    })
    if (decision === 'approve') {
      nodes = releaseDownstreamBlocks(nodes, nodeId)
    } else if (downstreamImpact && targetIndex >= 0) {
      const message = '上游节点存在可能影响后文的实质问题；上游通过后，本节点会自动重新检查一致性。'
      nodes = nodes.map((node, index) => {
        if (index <= targetIndex || !node.draft || ['node_revision_required', 'node_human_review', 'node_failed'].includes(node.status)) return node
        const blockers = [...new Set([...(node.blockedByNodeIds || []), nodeId])]
        return {
          ...node,
          status: 'node_review',
          reviewRequired: true,
          reviewDecision: null,
          approvedAt: null,
          blockedByNodeIds: blockers,
          consistencyRequests: [...(node.consistencyRequests || []).slice(-9), { sourceNodeId: nodeId, message, at: nowIso() }],
          updatedAt: nowIso()
        }
      })
    }
    return { ...lesson, nodes, status: lessonNodeStatus({ ...lesson, nodes }) }
  })
  if (!found) throw new Error('Node not found')
  const lessonStatus = firstLesson(next, lessonKey).status
  const stepStatusValue = lessonStatus === 'assembly_pending' ? 'done'
    : lessonStatus === 'node_human_review' ? 'waiting_human'
      : lessonStatus === 'node_revision_required' ? 'waiting_revision' : 'running'
  return withDerivedProgress(setStep({
    ...next,
    status: lessonStatus,
    currentStep: lessonStatus === 'assembly_pending' ? 'assembly' : lessonStatus === 'node_pending' ? 'node_generating' : 'node_review'
  }, 'node_review', stepStatusValue))
}

export function updateNodeDraft(workflow, lessonKey, nodeId, patch = {}) {
  let next = saveNodeDraft(workflow, lessonKey, nodeId, patch.markdown || patch.draft, { source: patch.source || (patch.reviewerReport ? 'worker' : 'user'), trace: patch.trace || null })
  if (patch.reviewerReport) next = applyNodeReview(next, lessonKey, nodeId, patch.reviewerReport, { trace: patch.trace || null })
  if (patch.revisionRequest) next = requestNodeRevision(next, lessonKey, nodeId, patch.revisionRequest)
  return next
}

export function requestNodeRevision(workflow, lessonKey, nodeId, request = '') {
  const value = cleanText(typeof request === 'string' ? request : request.message || '')
  if (!value) throw new Error('revision request is required')
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => {
    const nodes = (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    return { ...node, status: 'node_revision_required',
      revisionRequests: versioned({ message: value, source: 'user' }, node.revisionRequests, { source: 'user' }),
      revisionCount: Number(node.revisionCount || 0),
      reviewDecision: 'revise', humanReviewRequired: false, manualRevisionRequested: true, taskError: null, updatedAt: nowIso() }
    })
    return { ...lesson, nodes, status: lessonNodeStatus({ ...lesson, nodes }) }
  })
  if (!found) throw new Error('Node not found')
  return withDerivedProgress({ ...next, status: 'node_revision_required', currentStep: 'node_review' })
}

function finishNodeApproval(workflow, lessonKey) {
  const current = firstLesson(workflow, lessonKey)
  const status = lessonNodeStatus(current)
  const synced = mapLesson(workflow, lessonKey, lesson => ({ ...lesson, status }))
  const nodeStepStatus = status === 'assembly_pending' ? 'done' : status === 'node_human_review' ? 'waiting_human' : 'running'
  return withDerivedProgress(setStep({ ...synced, status, currentStep: status === 'assembly_pending' ? 'assembly' : status === 'node_pending' ? 'node_generating' : 'node_review' }, 'node_review', nodeStepStatus))
}

export function approveNode(workflow, lessonKey, nodeId) {
  const threshold = Number(workflow.courseSpec?.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => {
    let nodes = (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    const report = node.reviewerReports?.[node.reviewerReports.length - 1]?.value
    if (!node.draft) throw new Error('node draft is required before approval')
    if (!reviewerApproves(report, threshold)) throw new Error('Reviewer approval is required before approving node')
    if (Number(report.reviewedDraftVersion || 0) !== Number(node.versions?.length || 0)) throw new Error('Current node draft must be reviewed before approval')
    return { ...node, status: 'node_approved', approvedAt: nowIso(), blocksDownstream: false, updatedAt: nowIso() }
    })
    nodes = releaseDownstreamBlocks(nodes, nodeId)
    return { ...lesson, nodes }
  })
  if (!found) throw new Error('Node not found')
  return finishNodeApproval(next, lessonKey)
}

export function approveNodeHuman(workflow, lessonKey, nodeId, reason = '') {
  const note = cleanText(reason); if (!note) throw new Error('Human approval reason is required')
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => {
    let nodes = (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    const report = node.reviewerReports?.[node.reviewerReports.length - 1]?.value
    if (!node.draft) throw new Error('node draft is required before approval')
    if (node.status !== 'node_human_review' && report?.decision !== 'human_review') throw new Error('Node is not waiting for human review')
    if (Number(report.reviewedDraftVersion || 0) !== Number(node.versions?.length || 0)) throw new Error('Current node draft must be reviewed before approval')
    return { ...node, status: 'node_approved', humanReviewRequired: false, blocksDownstream: false, humanApproval: { reason: note, at: nowIso() }, approvedAt: nowIso(), updatedAt: nowIso() }
    })
    nodes = releaseDownstreamBlocks(nodes, nodeId)
    return { ...lesson, nodes }
  })
  if (!found) throw new Error('Node not found')
  return finishNodeApproval(next, lessonKey)
}

function stripMetaBlock(markdown = '') {
  return cleanText(markdown)
    .replace(/<!--\s*META[\s\S]*?-->\s*/gi, '')
    .replace(/META_FOR_NODE:\s*\n[\s\S]*?(?=\n\s*\n|$)/gi, '')
    .trim()
}

function extractNodeMetadata(node) {
  const values = []
  const draft = String(node.draft || '')
  const matches = draft.matchAll(/^\s*-?\s*(CONCEPT|PROVISION|CASE|PITFALL):\s*(.+?)\s*$/gim)
  for (const match of matches) values.push([match[1].toUpperCase(), cleanText(match[2])])
  ;(node.concepts || []).forEach(value => values.push(['CONCEPT', cleanText(value)]))
  ;(node.statutes || []).forEach(value => values.push(['PROVISION', cleanText(value).replace(/[《》〈〉]/g, '')]))
  ;(node.cases || []).forEach(value => values.push(['CASE', cleanText(value)]))
  return values.filter(([, value]) => value)
}

function renderMetaBlock(nodes = []) {
  const typeOrder = { CONCEPT: 0, PROVISION: 1, CASE: 2, PITFALL: 3 }
  const seen = new Set()
  const rows = nodes.flatMap(extractNodeMetadata).filter(([type, value]) => {
    const key = `${type}:${value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => (typeOrder[a[0]] ?? 9) - (typeOrder[b[0]] ?? 9) || a[1].localeCompare(b[1], 'zh-CN'))
  const lines = rows.map(([type, value]) => `META: ${type}: ${value}`).join('\n')
  return ['<details><summary>📑 笔记元数据（用于跨课整合）</summary>', '<pre><code>', lines, '</code></pre>', '</details>'].join('\n')
}

function chineseIndex(index) {
  const values = '一二三四五六七八九十'
  return values[index] || String(index + 1)
}

function spliceString(value, fallback = '') {
  return cleanText(value) || fallback
}

function uniqueStrings(values = []) {
  const seen = new Set()
  return values.map(value => cleanText(value)).filter(value => {
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function ensureCount(values, fallbacks, minimum, maximum) {
  const merged = uniqueStrings([...(Array.isArray(values) ? values : []), ...(fallbacks || [])])
  return merged.slice(0, Math.max(minimum, maximum))
}

function outlineTopic(outlineNode = {}, fallback = '本节内容') {
  return cleanText(outlineNode.title || fallback).replace(/^[一二三四五六七八九十]+、\s*/, '').replace(/[★☆]+\s*$/, '').trim() || fallback
}

function normalizedSpliceData(lesson, value = {}) {
  const outline = lesson.outline || []
  const overview = value.courseOverview || value.course_overview || {}
  const topics = outline.map(node => outlineTopic(node))
  const coreFallbacks = [
    ...topics.slice(0, 3).map(topic => `如何理解${topic}，它在本课论证中发挥什么作用？`),
    `本课各部分如何围绕“${lesson.blueprint?.mainLine || lesson.title}”形成完整的讲授主线？`,
    '本课涉及的概念、规则与案例之间有哪些需要辨析的联系？',
    '如何把本课的核心论证用于解释或分析具体问题？'
  ]
  const abilityFallbacks = [
    ...topics.slice(0, 3).map(topic => `解释${topic}的核心内容及其与本课主线的联系`),
    '复述本课的讲授主线并说明各部分之间的逻辑关系',
    '辨析本课容易混淆的概念、规则或观点',
    '运用本课的核心论证分析一个相关问题'
  ]
  const coreQuestions = ensureCount(overview.coreQuestions || overview.core_questions, coreFallbacks, 3, 5)
  const shouldBeAbleTo = ensureCount(overview.shouldBeAbleTo || overview.should_be_able_to, abilityFallbacks, 3, 5)
  const rawThread = spliceString(overview.lectureThread || overview.lecture_thread, lesson.blueprint?.mainLine || '')
  const fallbackThread = `本课围绕${topics.length ? topics.join('、') : lesson.title}依次展开。各部分按照已确认的大纲衔接，先建立概念和问题意识，再进入规则、论证与课堂材料的具体分析，最后回到本课主线说明各节点之间的关系。`
  const lectureThread = rawThread.length >= 60 ? rawThread : [rawThread, fallbackThread].filter(Boolean).join(' ')
  const incomingSummaries = value.sectionSummaries || value.h1Summaries || value.h1_summaries || {}
  const incomingQuizzes = value.sectionQuizzes || value.h1Quizzes || value.h1_quizzes || {}
  const sectionSummaries = {}
  const sectionQuizzes = {}
  outline.forEach(node => {
    const topic = outlineTopic(node)
    const rawSummary = spliceString(incomingSummaries[node.id], node.rationale || '')
    const fallbackSummary = `本节围绕${topic}展开，承担本课主线中的一个独立论证环节。通过已批准节点中的概念、规则、案例或教师讲授内容，本节说明该问题如何与前后章节衔接，并为后续理解和应用提供基础。`
    sectionSummaries[node.id] = rawSummary.length >= 45 ? rawSummary : [rawSummary, fallbackSummary].filter(Boolean).join(' ')
    sectionQuizzes[node.id] = ensureCount(incomingQuizzes[node.id], [
      `如何用自己的话解释${topic}的核心内容？`,
      `${topic}与本课相邻问题之间有什么区别或联系？`
    ], 2, 4)
  })
  const knowledge = value.knowledgeLink || value.knowledge_link || {}
  const incomingGroundwork = Array.isArray(knowledge.laysGroundworkFor)
    ? knowledge.laysGroundworkFor
    : (Array.isArray(knowledge.lays_groundwork_for) ? knowledge.lays_groundwork_for : [])
  const laysGroundworkFor = incomingGroundwork.length ? incomingGroundwork : topics.slice(0, 3).map(topic => ({
    concept: topic,
    use: '作为后续课程中相关规则、制度或案例分析的理解基础'
  }))
  return {
    courseOverview: { coreQuestions, shouldBeAbleTo, lectureThread },
    sectionSummaries,
    sectionQuizzes,
    knowledgeLink: {
      inheritsFrom: spliceString(knowledge.inheritsFrom || knowledge.inherits_from),
      laysGroundworkFor,
      nextLessonPreview: spliceString(knowledge.nextLessonPreview || knowledge.next_lesson_preview)
    },
    appendix: value.appendix && typeof value.appendix === 'object' ? value.appendix : {}
  }
}

function renderCourseOverview(value = {}, lesson) {
  const questions = Array.isArray(value.coreQuestions) ? value.coreQuestions.filter(Boolean).slice(0, 6) : []
  const abilities = Array.isArray(value.shouldBeAbleTo) ? value.shouldBeAbleTo.filter(Boolean).slice(0, 7) : []
  const thread = spliceString(value.lectureThread, lesson.blueprint?.mainLine || '')
  const lines = ['## 课程概览', '', '### 本课要回答的核心问题']
  ;(questions.length ? questions : [`如何理解${lesson.title}的核心问题及其展开逻辑？`]).forEach((item, index) => lines.push(`${index + 1}. ${item}`))
  lines.push('', '### 本课你应当能够')
  ;(abilities.length ? abilities : ['沿课程主线复述本课的核心概念、规则与案例论证']).forEach(item => lines.push(`- [ ] ${item}`))
  lines.push('', '### 课程脉络')
  lines.push(...String(thread || '本课按照已确认大纲逐节展开。').split('\n').map(line => `> ${line}`))
  return lines.join('\n')
}

function renderQuiz(items = []) {
  const questions = Array.isArray(items) ? items.filter(Boolean).slice(0, 4) : []
  if (!questions.length) return ''
  return ['> **自测**（合上笔记，能回答吗？）', ...questions.map((item, index) => `> ${index + 1}. ${item}`)].join('\n')
}

function renderKnowledgeLink(value = {}, lesson) {
  const groundwork = Array.isArray(value.laysGroundworkFor) ? value.laysGroundworkFor.filter(Boolean) : []
  const inferred = (lesson.outline || []).flatMap(node => node.concepts || []).slice(0, 3).map(concept => ({ concept, use: '作为后续相关制度、规则或案例分析的概念基础' }))
  const items = groundwork.length ? groundwork : inferred
  const lines = ['## 知识连接', '']
  const inherited = spliceString(value.inheritsFrom)
  if (inherited) lines.push(`**承接什么**：${inherited}`, '')
  lines.push('**为后续铺垫什么**：')
  ;(items.length ? items : [{ concept: lesson.title, use: '为后续课程中的深化与应用提供基础' }]).forEach(item => {
    if (typeof item === 'string') lines.push(`- ${item}`)
    else lines.push(`- ${spliceString(item.concept, '本课核心内容')} → ${spliceString(item.use, '后续课程中的深化与应用')}`)
  })
  const preview = spliceString(value.nextLessonPreview)
  if (preview) lines.push('', `**下节预告**：${preview}`)
  return lines.join('\n')
}

function renderAppendix(value = {}) {
  const terms = Array.isArray(value.terms) ? value.terms.filter(Boolean) : []
  const topics = Array.isArray(value.topics) ? value.topics.filter(Boolean) : []
  if (!terms.length && !topics.length) return ''
  const lines = ['## 附录：补充与发散', '', '> 以下内容为课堂补充材料和发散性讨论，不影响课程主线。']
  if (terms.length) {
    lines.push('', '### 术语汇总', '', '| 术语 | 英文/原文 | 定义或说明 |', '|------|----------|-----------|')
    terms.forEach(term => lines.push(`| ${spliceString(term.term)} | ${spliceString(term.original)} | ${spliceString(term.definition)} |`))
  }
  topics.forEach(topic => lines.push('', `### ${spliceString(topic.title, '发散话题')}`, '', spliceString(topic.content)))
  return lines.join('\n')
}

function buildFinalNoteMarkdown(workflow, lesson, spliceData = {}) {
  const byOutline = new Map((lesson.outline || []).map(item => [item.id, []]))
  const orphan = []
  ;(lesson.nodes || []).forEach(node => {
    if (byOutline.has(node.outlineNodeId)) byOutline.get(node.outlineNodeId).push(node)
    else orphan.push(node)
  })
  const summaries = spliceData.sectionSummaries || spliceData.h1Summaries || {}
  const quizzes = spliceData.sectionQuizzes || spliceData.h1Quizzes || {}
  const parts = [
    `# ${lesson.title}`,
    '',
    `> 课程：${workflow.courseSpec.courseName || ''}${workflow.courseSpec.teacher ? ` · ${workflow.courseSpec.teacher}` : ''}`,
    '',
    renderCourseOverview(spliceData.courseOverview || spliceData.course_overview || {}, lesson),
    '',
    '***'
  ]
  ;(lesson.outline || []).forEach((outlineNode, index) => {
    const title = cleanText(outlineNode.title).replace(/^[一二三四五六七八九十]+、\s*/, '')
    parts.push('', `### ${chineseIndex(index)}、${title}`, '')
    const summary = spliceString(summaries[outlineNode.id], outlineNode.rationale || '')
    if (summary) parts.push(summary, '')
    ;(byOutline.get(outlineNode.id) || []).forEach(node => parts.push(stripMetaBlock(node.draft), ''))
    const quiz = renderQuiz(quizzes[outlineNode.id])
    if (quiz) parts.push(quiz, '')
    parts.push('***')
  })
  if (orphan.length) {
    parts.push('', '### 其他', '')
    orphan.forEach(node => parts.push(stripMetaBlock(node.draft), ''))
    parts.push('***')
  }
  const appendix = renderAppendix(spliceData.appendix || {})
  if (appendix) parts.push('', appendix, '')
  parts.push('', renderKnowledgeLink(spliceData.knowledgeLink || spliceData.knowledge_link || {}, lesson), '', '***', '', renderMetaBlock(lesson.nodes || []))
  return parts.filter((value, index, array) => value !== '' || array[index - 1] !== '').join('\n').replace(/\n{4,}/g, '\n\n\n').trim()
}

export function assembleFinalNote(workflow, lessonKey, spliceData = {}, { trace = null } = {}) {
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.nodes?.length || lesson.nodes.some(node => node.status !== 'node_approved')) throw new Error('all nodes must be approved before assembly')
  const normalized = normalizedSpliceData(lesson, spliceData)
  const markdown = buildFinalNoteMarkdown(workflow, lesson, normalized)
  const missingBody = (lesson.nodes || []).find(node => {
    const body = stripMetaBlock(node.draft)
    return body && !markdown.includes(body)
  })
  if (missingBody) throw new Error(`assembled note is missing approved node body: ${missingBody.id}`)
  if (/\{\{[^}]+\}\}/.test(markdown)) throw new Error('assembled note still contains splice placeholders')
  const assembly = { spliceData: normalized, trace, assembledAt: nowIso(), nodeVersions: Object.fromEntries((lesson.nodes || []).map(node => [node.id, node.versions?.length || 0])) }
  const next = mapLesson(workflow, lessonKey, item => ({
    ...item,
    status: 'final_review',
    qualityReport: null,
    finalReviewAttention: null,
    finalNote: { markdown, stale: false, qualityReport: null, updatedAt: nowIso(), assembly },
    publication: item.publication ? { ...item.publication, stale: true } : null,
    finalNoteVersions: versioned(markdown, item.finalNoteVersions, { source: 'assembly', trace, summary: '按已批准节点机械拼装，并补入课程概览、章节总结、自测、知识连接、附录与元数据。' })
  }))
  return withDerivedProgress(setStep(setStep({ ...next, status: 'final_review', currentStep: 'final_review' }, 'assembly', 'done'), 'final_review', 'running'))
}

const issueMessage = issue => typeof issue === 'string' ? issue : cleanText(issue?.message || issue?.detail || issue?.type || '')
function issueNodeIds(issues = [], lesson) {
  const known = new Set((lesson.nodes || []).map(node => node.id))
  return [...new Set(issues.map(issue => typeof issue === 'object' ? issue.nodeId : '').filter(id => known.has(id)))]
}

function createFinalReviewAttention(lesson, report, code, message) {
  return {
    code,
    message,
    lessonKey: lesson.key,
    nodeIds: issueNodeIds(report.issues || [], lesson),
    issues: report.issues || [],
    trace: report.trace || null,
    retryable: false,
    createdAt: nowIso()
  }
}

export function setLessonPublication(workflow, lessonKey, publication = {}) {
  return withDerivedProgress(mapLesson(workflow, lessonKey, item => ({
    ...item,
    publication: {
      ...(item.publication || {}),
      ...publication,
      stale: Boolean(publication.stale),
      updatedAt: nowIso()
    }
  })))
}

export function trashLessonNote(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.finalNote?.markdown) throw new Error('lesson note does not exist')
  if (lesson.noteDeletion?.deletedAt) return workflow
  return withDerivedProgress(mapLesson(workflow, lessonKey, item => ({
    ...item,
    noteDeletion: {
      deletedAt: nowIso(),
      previousStatus: item.status,
      source: 'user'
    }
  })))
}

export function restoreLessonNote(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.noteDeletion?.deletedAt) throw new Error('lesson note is not in trash')
  return withDerivedProgress(mapLesson(workflow, lessonKey, item => ({
    ...item,
    noteDeletion: null
  })))
}

export function purgeLessonNote(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.noteDeletion?.deletedAt) throw new Error('move the lesson note to trash before permanent deletion')
  const lessons = workflow.lessons.map(item => item.key === lessonKey ? {
    ...item,
    status: 'note_removed',
    finalNote: null,
    finalNoteVersions: [],
    finalReviewReports: [],
    finalRevisionRequests: [],
    finalRevisionCount: 0,
    finalReviewAttention: null,
    qualityReport: null,
    noteDeletion: null,
    notePurgedAt: nowIso(),
    updatedAt: nowIso()
  } : item)
  const active = [...lessons]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .find(item => item.status !== 'completed')
  return withDerivedProgress({
    ...workflow,
    lessons,
    status: active?.status || 'completed',
    currentStep: active?.status === 'note_removed' ? 'final_review' : workflow.currentStep,
    taskLease: null,
    taskLeases: [],
    updatedAt: nowIso()
  })
}

export function regenerateLessonNote(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (lesson.status !== 'note_removed') throw new Error('lesson note is not permanently removed')
  if (!(lesson.nodes || []).length || (lesson.nodes || []).some(node => node.status !== 'node_approved')) {
    throw new Error('all lesson nodes must remain approved before regenerating the final note')
  }
  let next = mapLesson(workflow, lessonKey, item => ({
    ...item,
    status: 'assembly_pending',
    noteDeletion: null,
    updatedAt: nowIso()
  }))
  next = {
    ...next,
    status: 'assembly_pending',
    currentStep: 'assembly',
    paused: false,
    resumeStatus: null,
    taskLease: null,
    taskLeases: []
  }
  next = setStep(next, 'assembly', 'pending')
  next = setStep(next, 'final_review', 'pending')
  next = setStep(next, 'completed', 'pending')
  return withDerivedProgress(next)
}

export function requestFinalNoteRevision(workflow, lessonKey, request) {
  const value = cleanText(request)
  if (!value) throw new Error('final note revision request is required')
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.finalNote?.markdown) throw new Error('final note must exist before requesting a revision')
  const next = mapLesson(workflow, lessonKey, item => ({
    ...item,
    status: 'final_revision_required',
    finalReviewAttention: null,
    finalRevisionRequests: versioned(
      { message: value, source: 'user' },
      item.finalRevisionRequests,
      { source: 'user' }
    )
  }))
  return withDerivedProgress(
    setStep(
      { ...next, status: 'final_revision_required', currentStep: 'final_review' },
      'final_review',
      'running'
    )
  )
}

export function saveFinalNoteRevision(workflow, lessonKey, markdown, { trace = null } = {}) {
  const value = cleanText(markdown)
  if (!value) throw new Error('final note revision markdown is required')
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.finalNote?.markdown) throw new Error('final note must exist before revision')
  const next = mapLesson(workflow, lessonKey, item => {
    const latestRequest = item.finalRevisionRequests?.at?.(-1)?.value || null
    const automaticRevision = latestRequest?.source === 'final-review'
    return {
      ...item,
      status: 'final_review',
      qualityReport: null,
      finalReviewAttention: null,
      finalRevisionCount: automaticRevision
        ? Number(item.finalRevisionCount || 0) + 1
        : Number(item.finalRevisionCount || 0),
      finalNote: {
        ...item.finalNote,
        markdown: value,
        stale: false,
        qualityReport: null,
        updatedAt: nowIso(),
        editedByModel: true
      },
      publication: item.publication ? { ...item.publication, stale: true } : null,
      finalNoteVersions: versioned(value, item.finalNoteVersions, {
        source: 'final-revision',
        trace,
        summary: automaticRevision ? '根据自动最终检查修订最终笔记。' : '根据用户提交的最终修改要求生成。'
      })
    }
  })
  return withDerivedProgress(
    setStep(
      { ...next, status: 'final_review', currentStep: 'final_review' },
      'final_review',
      'running'
    )
  )
}

export function saveFinalNoteDraft(workflow, lessonKey, markdown) {
  const value = cleanText(markdown); if (!value) throw new Error('final note markdown is required')
  const lesson = firstLesson(workflow, lessonKey); if (!lesson.finalNote?.markdown) throw new Error('final note must exist before editing')
  if (value === lesson.finalNote.markdown) return workflow
  const next = mapLesson(workflow, lessonKey, item => ({
    ...item,
    status: 'final_review',
    qualityReport: null,
    finalReviewAttention: null,
    finalNote: { ...item.finalNote, markdown: value, stale: false, qualityReport: null, updatedAt: nowIso(), editedByUser: true },
    publication: item.publication ? { ...item.publication, stale: true } : null,
    finalNoteVersions: versioned(value, item.finalNoteVersions, { source: 'user' })
  }))
  return withDerivedProgress(setStep({ ...next, status: 'final_review', currentStep: 'final_review' }, 'final_review', 'running'))
}

function finishLessonWithFinalReport(workflow, lessonKey, qualityReport, { source = 'worker' } = {}) {
  const completed = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'completed', completedAt: nowIso(),
    finalReviewAttention: null,
    finalNote: { ...item.finalNote, qualityReport, stale: false, updatedAt: nowIso() },
    finalReviewReports: versioned(qualityReport, item.finalReviewReports, { source }), qualityReport }))
  const remaining = getActiveLesson(completed)
  if (remaining && remaining.key !== lessonKey && remaining.status !== 'completed') {
    return withDerivedProgress({ ...completed, status: remaining.status === 'preflight_required' ? 'outline_pending' : remaining.status,
      currentStep: remaining.status === 'preflight_required' || remaining.status === 'outline_pending' ? 'outline_generating' : remaining.status,
      steps: resetStepsForNextLesson(completed.steps) })
  }
  return setStep(setStep({ ...completed, status: 'completed', currentStep: 'completed', progress: 100 }, 'final_review', 'done'), 'completed', 'done')
}

export function completeFinalReview(workflow, lessonKey, report = {}) {
  const lesson = firstLesson(workflow, lessonKey); if (!lesson.finalNote?.markdown) throw new Error('final note must be assembled before final review')
  const threshold = Number(workflow.courseSpec?.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)
  const normalized = normalizeReviewReport(report, lesson.finalNoteVersions?.length || 0)
  const decision = normalizedReviewDecision(normalized, threshold)
  const qualityReport = { ...normalized, decision, assembledNodeCount: lesson.nodes?.length || 0 }

  if (decision === 'human_review') {
    const reason = qualityReport.issues.map(issueMessage).filter(Boolean).join('；') || qualityReport.summary || '最终检查明确要求人工判断。'
    const attention = createFinalReviewAttention(lesson, qualityReport, 'final-review-human-required', reason)
    const next = mapLesson(workflow, lessonKey, item => ({
      ...item,
      status: 'final_review_human',
      finalReviewAttention: attention,
      finalNote: { ...item.finalNote, qualityReport },
      finalReviewReports: versioned(qualityReport, item.finalReviewReports, { source: 'worker' }),
      qualityReport
    }))
    return withDerivedProgress(setStep({ ...next, status: 'final_review_human', currentStep: 'final_review' }, 'final_review', 'waiting_human'))
  }

  if (decision === 'revise') {
    const targetIds = issueNodeIds(qualityReport.issues, lesson)
    const requests = qualityReport.issues.map(issueMessage).filter(Boolean)
    if (!targetIds.length) {
      const completedRevisions = Number(lesson.finalRevisionCount || 0)
      const maxRevisions = Math.max(0, Number(workflow.courseSpec?.maxFinalAutoRevisions ?? DEFAULT_COURSE_SPEC.maxFinalAutoRevisions))
      if (completedRevisions >= maxRevisions) {
        const humanReport = { ...qualityReport, decision: 'human_review', unmappedIssues: true, autoRevisionExhausted: true }
        const reason = requests.join('；') || qualityReport.summary || '最终检查仍发现无法定位到单一节点的问题，自动全文修订次数已用尽。'
        const attention = createFinalReviewAttention(lesson, humanReport, 'final-revision-exhausted', reason)
        const next = mapLesson(workflow, lessonKey, item => ({
          ...item,
          status: 'final_review_human',
          finalReviewAttention: attention,
          finalNote: { ...item.finalNote, qualityReport: humanReport },
          finalReviewReports: versioned(humanReport, item.finalReviewReports, { source: 'worker' }),
          qualityReport: humanReport
        }))
        return withDerivedProgress(setStep({ ...next, status: 'final_review_human', currentStep: 'final_review' }, 'final_review', 'waiting_human'))
      }

      const request = {
        message: requests.join('；') || qualityReport.summary || '最终检查要求修正整体结构、跨节点重复或术语一致性。',
        issues: qualityReport.issues,
        source: 'final-review'
      }
      const next = mapLesson(workflow, lessonKey, item => ({
        ...item,
        status: 'final_revision_required',
        finalReviewAttention: null,
        finalNote: { ...item.finalNote, stale: true, qualityReport },
        finalReviewReports: versioned(qualityReport, item.finalReviewReports, { source: 'worker' }),
        finalRevisionRequests: versioned(request, item.finalRevisionRequests, { source: 'final-review' }),
        qualityReport
      }))
      return withDerivedProgress(setStep({ ...next, status: 'final_revision_required', currentStep: 'final_review' }, 'final_review', 'running'))
    }

    const next = mapLesson(workflow, lessonKey, item => ({
      ...item,
      status: 'node_revision_required',
      finalReviewAttention: null,
      finalNote: { ...item.finalNote, stale: true, qualityReport },
      finalReviewReports: versioned(qualityReport, item.finalReviewReports, { source: 'worker' }),
      qualityReport,
      nodes: (item.nodes || []).map(node => !targetIds.includes(node.id) ? node : ({
        ...node,
        status: 'node_revision_required',
        reviewDecision: 'revise',
        revisionRequests: versioned({ message: requests.join('；') || '最终检查要求重新核对本节点。', source: 'final-review' }, node.revisionRequests, { source: 'final-review' }),
        updatedAt: nowIso()
      }))
    }))
    return withDerivedProgress(setStep({ ...next, status: 'node_revision_required', currentStep: 'node_review' }, 'final_review', 'waiting_revision'))
  }

  return finishLessonWithFinalReport(workflow, lessonKey, qualityReport, { source: 'worker' })
}

export function approveFinalReviewHuman(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (!['final_review', 'final_review_human'].includes(lesson.status)) throw new Error('final review is not waiting for human approval')
  const qualityReport = { ...(lesson.qualityReport || lesson.finalNote?.qualityReport || {}), decision: 'human_approved', humanApproved: true, humanApprovedAt: nowIso() }
  return finishLessonWithFinalReport(workflow, lessonKey, qualityReport, { source: 'user' })
}

function nodeLaneForTask(taskType = '') {
  if (taskType === 'write-node') return 'writer'
  if (taskType === 'review-node') return 'reviewer'
  if (taskType === 'revise-node') return 'revision'
  return ''
}

function retryStatusForTask(taskType = '') {
  if (taskType === 'write-node') return 'node_pending'
  if (taskType === 'review-node') return 'node_review'
  if (taskType === 'revise-node') return 'node_revision_required'
  return 'node_review'
}

export function recordNodeTaskFailure(workflow, { lessonKey, nodeId, taskType, error, retryable = true } = {}) {
  const lane = nodeLaneForTask(taskType)
  if (!lane) throw new Error('Unsupported node task failure')
  const max = Math.max(0, Number(workflow.courseSpec?.maxTechnicalRetries ?? DEFAULT_COURSE_SPEC.maxTechnicalRetries))
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => {
    const nodes = (lesson.nodes || []).map(node => {
      if (node.id !== nodeId) return node
      found = true
      const count = Number(node.taskFailures?.[lane] || 0) + 1
      const exhausted = !retryable || count > max
      return {
        ...node,
        status: exhausted ? 'node_failed' : retryStatusForTask(taskType),
        taskFailures: { ...(node.taskFailures || {}), [lane]: count },
        taskError: { taskType, message: cleanText(error) || '课程处理失败', retryable, count, at: nowIso() },
        humanReviewRequired: exhausted,
        updatedAt: nowIso()
      }
    })
    return { ...lesson, nodes, status: lessonNodeStatus({ ...lesson, nodes }) }
  })
  if (!found) throw new Error('Node not found')
  const status = firstLesson(next, lessonKey).status
  return withDerivedProgress({ ...next, status, currentStep: status === 'node_pending' ? 'node_generating' : 'node_review' })
}

export function retryNode(workflow, lessonKey, nodeId) {
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => {
    const nodes = (lesson.nodes || []).map(node => {
      if (node.id !== nodeId) return node
      found = true
      const taskType = node.taskError?.taskType || (node.draft ? 'review-node' : 'write-node')
      return { ...node, status: retryStatusForTask(taskType), taskError: null, humanReviewRequired: false, updatedAt: nowIso() }
    })
    return { ...lesson, nodes, status: lessonNodeStatus({ ...lesson, nodes }) }
  })
  if (!found) throw new Error('Node not found')
  const status = firstLesson(next, lessonKey).status
  return withDerivedProgress({ ...next, status, currentStep: status === 'node_pending' ? 'node_generating' : 'node_review' })
}


export function failStep(workflow, { step, error, retryable = true, taskKey = '' }) {
  const message = cleanText(error) || '课程处理失败'
  const previous = [...(workflow.errors || [])].reverse().find(item => !item.resolvedAt && item.step === step && item.message === message)
  const entry = previous || { id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, step, message, retryable, taskKey: cleanText(taskKey), at: nowIso() }
  const errors = previous ? (workflow.errors || []) : [...(workflow.errors || []), entry]
  const resumeStatus = workflow.status === 'failed'
    ? workflow.resumeStatus || workflow.currentStep || 'outline_pending'
    : workflow.status
  return { ...setStep(workflow, step, 'failed', { error: entry }), status: 'failed', resumeStatus, currentStep: step, activeErrorId: entry.id, errors, updatedAt: nowIso() }
}

export function pauseWorkflow(workflow) { return { ...workflow, status: 'paused', resumeStatus: workflow.status, paused: true, taskLease: null, taskLeases: [], updatedAt: nowIso() } }
export function resumeWorkflow(workflow) {
  const resolvedAt = nowIso()
  return {
    ...workflow,
    status: workflow.resumeStatus || workflow.currentStep || 'outline_pending',
    resumeStatus: null,
    paused: false,
    taskLease: null,
    taskLeases: [],
    activeErrorId: null,
    errors: (workflow.errors || []).map(error => error.resolvedAt ? error : { ...error, resolvedAt }),
    steps: (workflow.steps || []).map(step => step.status === 'failed' ? { ...step, status: 'pending', error: null, updatedAt: resolvedAt } : step),
    updatedAt: resolvedAt
  }
}
export function cancelWorkflow(workflow, reason = '') { return { ...workflow, status: 'cancelled', cancelled: true, cancelReason: cleanText(reason), taskLease: null, taskLeases: [], updatedAt: nowIso() } }
