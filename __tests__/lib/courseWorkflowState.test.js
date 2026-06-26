import {
  applyNodeReview,
  approveNode,
  approveOutline,
  assembleFinalNote,
  completeFinalReview,
  createInitialWorkflow,
  planNodesFromOutline,
  saveCourseSpec,
  saveNodeDraft,
  startOutlineReview
} from '@/lib/course/workflowState'
import { buildTextPack } from '@/lib/course/textpack'

function sampleWorkflow(twoLessons = false) {
  const lessons = [
    { order: 1, title: '第1课', transcript: ['概念一', '概念二', '规则一', '案例一', '结论一'].join('\n') },
    ...(twoLessons ? [{ order: 2, title: '第2课', transcript: '第二课第一行\n第二课第二行' }] : [])
  ]
  const textPack = buildTextPack({ course: { name: '证据法', teacher: '张老师' }, lessons, decks: [] })
  return createInitialWorkflow({ textPack, courseName: '证据法', teacher: '张老师' })
}

function approveAllNodes(workflow, lessonKey) {
  const ids = workflow.lessons.find(lesson => lesson.key === lessonKey).nodes.map(node => node.id)
  return ids.reduce((state, id) => {
    const drafted = saveNodeDraft(state, lessonKey, id, `## ${id}\n\n基于来源形成的正文。`, { source: 'worker' })
    const reviewed = applyNodeReview(drafted, lessonKey, id, {
      coverage: 90, grounding: 92, logic: 88, detail: 86, sourceCoverage: 90, issues: [], decision: 'approve'
    })
    return approveNode(reviewed, lessonKey, id)
  }, workflow)
}

describe('controlled course workflow', () => {
  it('forces line-based splitting and keeps writer, reviewer and human approval separate', () => {
    let base = sampleWorkflow()
    base = { ...base, lessons: base.lessons.map(lesson => lesson.key === 'lesson-01' ? { ...lesson, transcript: Array.from({ length: 45 }, (_, index) => `第${index + 1}行`).join('\n') } : lesson) }
    const withSpec = saveCourseSpec(base, { nodeSplitThreshold: 99999, nodeSplitLineThreshold: 20, qualityThreshold: 75 })
    const outlined = startOutlineReview(withSpec, {
      lessonKey: 'lesson-01', mainLine: '证据规则',
      outline: [{ title: '全部内容', lineRange: [1, 45], slideRange: [1, 1], rationale: '完整覆盖', importance: 'high' }]
    })
    const planned = planNodesFromOutline(approveOutline(outlined, 'lesson-01'), 'lesson-01')
    expect(planned.lessons[0].nodes).toHaveLength(3)

    const first = planned.lessons[0].nodes[0]
    const drafted = saveNodeDraft(planned, 'lesson-01', first.id, '## 草稿\n\n正文', { source: 'worker' })
    expect(drafted.lessons[0].nodes[0].status).toBe('node_review')
    expect(() => approveNode(drafted, 'lesson-01', first.id)).toThrow(/Reviewer approval/)

    const reviewed = applyNodeReview(drafted, 'lesson-01', first.id, { coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90, issues: [], decision: 'approve' })
    expect(reviewed.lessons[0].nodes[0].status).toBe('node_review')
    expect(approveNode(reviewed, 'lesson-01', first.id).lessons[0].nodes[0].status).toBe('node_approved')
  })

  it('returns final-review revision to the cited node instead of failing the workflow', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75, nodeSplitLineThreshold: 200 })
    const outline = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outline, 'lesson-01'), 'lesson-01')
    const approved = approveAllNodes(planned, 'lesson-01')
    const assembled = assembleFinalNote(approved, 'lesson-01')
    const nodeId = assembled.lessons[0].nodes[0].id

    const revised = completeFinalReview(assembled, 'lesson-01', {
      coverage: 70, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90,
      issues: [{ nodeId, type: 'missing_content', severity: 'high', message: '需要补充论证。' }], decision: 'revise'
    })
    expect(revised.status).toBe('node_revision_required')
    expect(revised.lessons[0].nodes[0].status).toBe('node_revision_required')
    expect(revised.lessons[0].finalNote.stale).toBe(true)
  })

  it('advances from a completed first lesson to the second lesson', () => {
    const spec = saveCourseSpec(sampleWorkflow(true), { qualityThreshold: 75 })
    const outline = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '第一课', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outline, 'lesson-01'), 'lesson-01')
    const approved = approveAllNodes(planned, 'lesson-01')
    const assembled = assembleFinalNote(approved, 'lesson-01')
    const next = completeFinalReview(assembled, 'lesson-01', { coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90, issues: [], decision: 'approve' })

    expect(next.lessons[0].status).toBe('completed')
    expect(next.lessons[1].status).toBe('outline_pending')
    expect(next.status).toBe('outline_pending')
    expect(next.progress).toBeLessThan(100)
  })

  it('rejects outlines that leave source lines uncovered', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75 })
    expect(() => startOutlineReview(spec, {
      lessonKey: 'lesson-01',
      outline: [{ title: '不完整大纲', lineRange: [2, 4], slideRange: [1, 1], rationale: '遗漏首尾' }]
    })).toThrow(/start from transcript line 1|uncovered/)
  })

})
