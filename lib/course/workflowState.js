import { cleanText } from './textpack'

export const COURSE_WORKFLOW_STATUSES = [
  'preflight_required', 'outline_pending', 'outline_generating', 'outline_review', 'outline_approved',
  'node_planning', 'node_pending', 'node_generating', 'node_review', 'node_revision_required',
  'assembly_pending', 'assembling', 'final_review', 'final_review_human', 'completed', 'failed', 'paused', 'cancelled'
]

export const COURSE_STEP_KEYS = [
  'imported', 'preflight', 'outline_generating', 'outline_review', 'outline_approved',
  'node_planning', 'node_generating', 'node_review', 'assembly', 'final_review', 'completed'
]

const DEFAULT_COURSE_SPEC = {
  goal: '全面笔记', useCase: '自学', detailLevel: 'high', preserveOralStyle: 'clean',
  statuteMode: 'explain-when-mentioned', caseMode: 'extract-facts-issue-rule', teacherViewMode: 'mark-as-teacher-view',
  recitationHints: false, nodeSplitThreshold: 12000, nodeSplitLineThreshold: 200,
  qualityThreshold: 75, maxAutoRevisions: 2, promptVersion: 'course-controlled-v2',
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
    createdAt: nowIso(), updatedAt: nowIso()
  }
}

const allNodes = workflow => (workflow.lessons || []).flatMap(lesson => lesson.nodes || [])

function scoresMeetThreshold(report = {}, threshold = 75) {
  return ['coverage', 'grounding', 'logic', 'detail', 'sourceCoverage'].every(key => Number(report[key] || 0) >= threshold)
}

function reviewerApproves(report = {}, threshold = 75) {
  return report.decision === 'approve' && scoresMeetThreshold(report, threshold)
}

function normalizeReviewReport(report = {}, draftVersion = 0) {
  const decision = ['approve', 'revise', 'human_review'].includes(report.decision) ? report.decision : 'human_review'
  return {
    coverage: Number(report.coverage ?? 0), grounding: Number(report.grounding ?? 0), logic: Number(report.logic ?? 0),
    detail: Number(report.detail ?? 0), sourceCoverage: Number(report.sourceCoverage ?? 0),
    issues: Array.isArray(report.issues) ? report.issues : [], decision,
    reviewedDraftVersion: Number(report.reviewedDraftVersion || draftVersion), checkedAt: report.checkedAt || nowIso(), trace: report.trace || null
  }
}

function stageFraction(status) {
  return ({ preflight_required: .05, outline_pending: .12, outline_generating: .18, outline_review: .28, outline_approved: .36,
    node_planning: .42, node_pending: .5, node_generating: .56, node_review: .66, node_revision_required: .62,
    assembly_pending: .76, assembling: .8, final_review: .88, final_review_human: .9, completed: 1 })[status] ?? 0
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
  if (nodes.some(node => node.status === 'node_revision_required')) return 'node_revision_required'
  if (nodes.some(node => node.status === 'node_pending')) return 'node_pending'
  if (nodes.every(node => node.status === 'node_approved')) return 'assembly_pending'
  return 'node_review'
}

export function createInitialWorkflow({ textPack, courseName, teacher }) {
  const createdAt = nowIso()
  return {
    schemaVersion: 'course-workflow.v2', status: 'preflight_required', currentStep: 'preflight', progress: 0,
    paused: false, cancelled: false, resumeStatus: null,
    worker: { status: 'offline', lastSeenAt: null, message: '本地处理服务未连接' },
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
      finalNoteVersions: [], finalReviewReports: [], qualityReport: null
    })),
    artifacts: { textPackManifest: textPack.manifest, sourceHash: textPack.manifest?.sourceHash || textPack.checksums?.sourceHash },
    steps: baseSteps(), pendingSteps: [], appliedTaskKeys: [], errors: [], feedback: [], createdAt, updatedAt: createdAt
  }
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
    maxAutoRevisions: Number(patch.maxAutoRevisions ?? workflow.courseSpec.maxAutoRevisions ?? DEFAULT_COURSE_SPEC.maxAutoRevisions)
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
  const next = mapLesson(workflow, lessonKey, lesson => ({ ...lesson, nodes: (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    const draft = cleanText(markdown)
    if (!draft) throw new Error('node draft is required')
    const changed = draft !== node.draft
    return { ...node, status: 'node_review', draft,
      versions: changed ? versioned(draft, node.versions, { source, trace }) : node.versions,
      reviewRequired: changed || !node.reviewerReports?.length, reviewDecision: changed ? null : node.reviewDecision,
      stale: false, updatedAt: nowIso() }
  }) }))
  if (!found) throw new Error('Node not found')
  return withDerivedProgress({ ...next, status: 'node_review', currentStep: 'node_review' })
}

export function applyNodeReview(workflow, lessonKey, nodeId, report = {}, { trace = null } = {}) {
  const threshold = Number(workflow.courseSpec?.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)
  let nextStatus = 'node_review'; let found = false
  const next = mapLesson(workflow, lessonKey, lesson => ({ ...lesson, nodes: (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    if (!node.draft) throw new Error('node draft is required before review')
    const normalized = normalizeReviewReport({ ...report, trace }, node.versions?.length || 0)
    const approved = reviewerApproves(normalized, threshold)
    const decision = approved ? 'approve' : normalized.decision === 'approve' ? 'revise' : normalized.decision
    const finalReport = { ...normalized, decision }
    if (decision === 'revise') nextStatus = 'node_revision_required'
    return { ...node, status: decision === 'revise' ? 'node_revision_required' : 'node_review',
      reviewerReports: versioned(finalReport, node.reviewerReports, { source: 'worker', trace }), reviewRequired: false,
      reviewDecision: decision, revisionCount: decision === 'revise' ? Number(node.revisionCount || 0) + 1 : Number(node.revisionCount || 0), updatedAt: nowIso() }
  }) }))
  if (!found) throw new Error('Node not found')
  return withDerivedProgress(setStep({ ...next, status: nextStatus, currentStep: 'node_review' }, 'node_review', nextStatus === 'node_revision_required' ? 'waiting_revision' : 'waiting_human'))
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
  const next = mapLesson(workflow, lessonKey, lesson => ({ ...lesson, nodes: (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    return { ...node, status: 'node_revision_required',
      revisionRequests: versioned({ message: value, source: 'user' }, node.revisionRequests, { source: 'user' }),
      reviewDecision: 'revise', updatedAt: nowIso() }
  }) }))
  if (!found) throw new Error('Node not found')
  return withDerivedProgress({ ...next, status: 'node_revision_required', currentStep: 'node_review' })
}

function finishNodeApproval(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  const status = lessonNodeStatus(lesson)
  return withDerivedProgress(setStep({ ...workflow, status, currentStep: status === 'assembly_pending' ? 'assembly' : status === 'node_pending' ? 'node_generating' : 'node_review' }, 'node_review', status === 'assembly_pending' ? 'done' : 'waiting_human'))
}

export function approveNode(workflow, lessonKey, nodeId) {
  const threshold = Number(workflow.courseSpec?.qualityThreshold || DEFAULT_COURSE_SPEC.qualityThreshold)
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => ({ ...lesson, nodes: (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    const report = node.reviewerReports?.[node.reviewerReports.length - 1]?.value
    if (!node.draft) throw new Error('node draft is required before approval')
    if (!reviewerApproves(report, threshold)) throw new Error('Reviewer approval is required before approving node')
    if (Number(report.reviewedDraftVersion || 0) !== Number(node.versions?.length || 0)) throw new Error('Current node draft must be reviewed before approval')
    return { ...node, status: 'node_approved', approvedAt: nowIso(), updatedAt: nowIso() }
  }) }))
  if (!found) throw new Error('Node not found')
  return finishNodeApproval(next, lessonKey)
}

export function approveNodeHuman(workflow, lessonKey, nodeId, reason = '') {
  const note = cleanText(reason); if (!note) throw new Error('Human approval reason is required')
  let found = false
  const next = mapLesson(workflow, lessonKey, lesson => ({ ...lesson, nodes: (lesson.nodes || []).map(node => {
    if (node.id !== nodeId) return node
    found = true
    const report = node.reviewerReports?.[node.reviewerReports.length - 1]?.value
    if (!node.draft) throw new Error('node draft is required before approval')
    if (report?.decision !== 'human_review') throw new Error('Node is not waiting for human review')
    if (Number(report.reviewedDraftVersion || 0) !== Number(node.versions?.length || 0)) throw new Error('Current node draft must be reviewed before approval')
    return { ...node, status: 'node_approved', humanApproval: { reason: note, at: nowIso() }, approvedAt: nowIso(), updatedAt: nowIso() }
  }) }))
  if (!found) throw new Error('Node not found')
  return finishNodeApproval(next, lessonKey)
}

export function assembleFinalNote(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (!lesson.nodes?.length || lesson.nodes.some(node => node.status !== 'node_approved')) throw new Error('all nodes must be approved before assembly')
  const markdown = [`# ${lesson.title}`, '', `> 课程：${workflow.courseSpec.courseName || ''}${workflow.courseSpec.teacher ? ` · ${workflow.courseSpec.teacher}` : ''}`, '', ...lesson.nodes.map(node => cleanText(node.draft))].filter(Boolean).join('\n\n')
  const next = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'final_review', finalNote: { markdown, stale: false, updatedAt: nowIso() }, finalNoteVersions: versioned(markdown, item.finalNoteVersions, { source: 'assembly' }) }))
  return withDerivedProgress(setStep(setStep({ ...next, status: 'final_review', currentStep: 'final_review' }, 'assembly', 'done'), 'final_review', 'running'))
}

const issueMessage = issue => typeof issue === 'string' ? issue : cleanText(issue?.message || issue?.detail || issue?.type || '')
function issueNodeIds(issues = [], lesson) {
  const known = new Set((lesson.nodes || []).map(node => node.id))
  return [...new Set(issues.map(issue => typeof issue === 'object' ? issue.nodeId : '').filter(id => known.has(id)))]
}

export function saveFinalNoteDraft(workflow, lessonKey, markdown) {
  const value = cleanText(markdown); if (!value) throw new Error('final note markdown is required')
  const lesson = firstLesson(workflow, lessonKey); if (!lesson.finalNote?.markdown) throw new Error('final note must exist before editing')
  if (value === lesson.finalNote.markdown) return workflow
  const next = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'final_review', qualityReport: null,
    finalNote: { ...item.finalNote, markdown: value, stale: false, qualityReport: null, updatedAt: nowIso(), editedByUser: true },
    finalNoteVersions: versioned(value, item.finalNoteVersions, { source: 'user' }) }))
  return withDerivedProgress(setStep({ ...next, status: 'final_review', currentStep: 'final_review' }, 'final_review', 'running'))
}

function finishLessonWithFinalReport(workflow, lessonKey, qualityReport, { source = 'worker' } = {}) {
  const completed = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'completed', completedAt: nowIso(),
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
  const decision = normalized.decision === 'approve' && !scoresMeetThreshold(normalized, threshold) ? 'revise' : normalized.decision
  const qualityReport = { ...normalized, decision, assembledNodeCount: lesson.nodes?.length || 0 }
  if (decision === 'human_review') {
    const next = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'final_review_human',
      finalNote: { ...item.finalNote, qualityReport }, finalReviewReports: versioned(qualityReport, item.finalReviewReports, { source: 'worker' }), qualityReport }))
    return withDerivedProgress(setStep({ ...next, status: 'final_review_human', currentStep: 'final_review' }, 'final_review', 'waiting_human'))
  }
  if (decision === 'revise') {
    const targetIds = issueNodeIds(qualityReport.issues, lesson); const reviseAll = targetIds.length === 0
    const requests = qualityReport.issues.map(issueMessage).filter(Boolean)
    const next = mapLesson(workflow, lessonKey, item => ({ ...item, status: 'node_revision_required',
      finalNote: { ...item.finalNote, stale: true, qualityReport }, finalReviewReports: versioned(qualityReport, item.finalReviewReports, { source: 'worker' }), qualityReport,
      nodes: (item.nodes || []).map(node => (!reviseAll && !targetIds.includes(node.id)) ? node : ({ ...node, status: 'node_revision_required', reviewDecision: 'revise',
        revisionRequests: versioned({ message: requests.join('；') || '最终检查要求重新核对本节点。', source: 'final-review' }, node.revisionRequests, { source: 'final-review' }), updatedAt: nowIso() })) }))
    return withDerivedProgress(setStep({ ...next, status: 'node_revision_required', currentStep: 'node_review' }, 'final_review', 'waiting_revision'))
  }
  return finishLessonWithFinalReport(workflow, lessonKey, qualityReport, { source: 'worker' })
}

export function approveFinalReviewHuman(workflow, lessonKey) {
  const lesson = firstLesson(workflow, lessonKey)
  if (lesson.status !== 'final_review_human') throw new Error('final review is not waiting for human approval')
  const qualityReport = { ...(lesson.qualityReport || lesson.finalNote?.qualityReport || {}), decision: 'human_approved', humanApproved: true, humanApprovedAt: nowIso() }
  return finishLessonWithFinalReport(workflow, lessonKey, qualityReport, { source: 'user' })
}

export function failStep(workflow, { step, error, retryable = true }) {
  const entry = { id: `error-${Date.now()}`, step, message: cleanText(error), retryable, at: nowIso() }
  return { ...setStep(workflow, step, 'failed', { error: entry }), status: 'failed', resumeStatus: workflow.status, currentStep: step, errors: [...(workflow.errors || []), entry], updatedAt: nowIso() }
}

export function pauseWorkflow(workflow) { return { ...workflow, status: 'paused', resumeStatus: workflow.status, paused: true, updatedAt: nowIso() } }
export function resumeWorkflow(workflow) { return { ...workflow, status: workflow.resumeStatus || workflow.currentStep || 'outline_pending', resumeStatus: null, paused: false, updatedAt: nowIso() } }
export function cancelWorkflow(workflow, reason = '') { return { ...workflow, status: 'cancelled', cancelled: true, cancelReason: cleanText(reason), taskLease: null, updatedAt: nowIso() } }
