import { getNextCourseWorkerTask, getNextCourseWorkerTasks } from '@/lib/course/workerTasks'

function workflowWith(status, lessons) {
  return { status, courseSpec: { maxAutoRevisions: 2 }, lessons }
}

describe('course worker task planner', () => {
  it('separates writing from independent review', () => {
    const baseLesson = { key: 'lesson-01', order: 1, title: '第1课', status: 'node_pending', outline: [], blueprint: {}, nodes: [{ id: 'node-1', status: 'node_pending', versions: [], reviewerReports: [] }] }
    expect(getNextCourseWorkerTask(workflowWith('node_pending', [baseLesson])).type).toBe('write-node')

    const drafted = { ...baseLesson, status: 'node_review', nodes: [{ ...baseLesson.nodes[0], status: 'node_review', draft: '正文', versions: [{ value: '正文' }], reviewRequired: true }] }
    expect(getNextCourseWorkerTask(workflowWith('node_review', [drafted])).type).toBe('review-node')
  })

  it('keeps one serial writer while allowing two independent reviews in the same batch', () => {
    const lesson = {
      key: 'lesson-01', order: 1, title: '第1课', status: 'node_pending', outline: [], blueprint: {},
      nodes: [
        { id: 'node-1', status: 'node_review', draft: '正文1', versions: [{ value: '正文1' }], reviewerReports: [], reviewRequired: true },
        { id: 'node-2', status: 'node_review', draft: '正文2', versions: [{ value: '正文2' }], reviewerReports: [], reviewRequired: true },
        { id: 'node-3', status: 'node_pending', versions: [], reviewerReports: [] },
        { id: 'node-4', status: 'node_pending', versions: [], reviewerReports: [] }
      ]
    }
    const tasks = getNextCourseWorkerTasks(workflowWith('node_pending', [lesson]), { reviewConcurrency: 2, totalConcurrency: 3 })
    expect(tasks.map(task => task.type)).toEqual(['write-node', 'review-node', 'review-node'])
    expect(tasks.filter(task => task.type === 'write-node')).toHaveLength(1)
    expect(tasks.find(task => task.type === 'write-node').node.id).toBe('node-3')
  })

  it('does not let the serial writer skip an unresolved upstream node while independent reviews keep running', () => {
    const lesson = {
      key: 'lesson-01', order: 1, title: '第1课', status: 'node_pending', outline: [], blueprint: {},
      nodes: [
        { id: 'node-1', status: 'node_revision_required', draft: '有结构性问题的前文', versions: [{ value: '有结构性问题的前文' }], blocksDownstream: true, revisionCount: 2, humanReviewRequired: true },
        { id: 'node-2', status: 'node_pending', versions: [], reviewerReports: [] },
        { id: 'node-3', status: 'node_review', draft: '可独立审查的正文', versions: [{ value: '可独立审查的正文' }], reviewerReports: [], reviewRequired: true },
        { id: 'node-4', status: 'node_review', draft: '等待前文一致性检查', versions: [{ value: '等待前文一致性检查' }], reviewerReports: [], reviewRequired: true, blockedByNodeIds: ['node-1'] }
      ]
    }
    const tasks = getNextCourseWorkerTasks(workflowWith('node_pending', [lesson]), { reviewConcurrency: 2, totalConcurrency: 3 })
    expect(tasks.map(task => task.type)).toEqual(['review-node'])
    expect(tasks[0].node.id).toBe('node-3')
  })

  it('waits instead of writing a later node when the preceding writer failed before producing a draft', () => {
    const lesson = {
      key: 'lesson-01', order: 1, title: '第1课', status: 'node_pending', outline: [], blueprint: {},
      nodes: [
        { id: 'node-1', status: 'node_failed', draft: '', versions: [], reviewerReports: [], taskError: { taskType: 'write-node' } },
        { id: 'node-2', status: 'node_pending', versions: [], reviewerReports: [] }
      ]
    }
    const tasks = getNextCourseWorkerTasks(workflowWith('node_pending', [lesson]))
    expect(tasks).toEqual([expect.objectContaining({ type: 'idle', reason: 'waiting-node-retry', nodeId: 'node-1' })])
  })

  it('uses the first unfinished lesson and stops at human gates', () => {
    const lessons = [
      { key: 'lesson-01', order: 1, status: 'completed', nodes: [] },
      { key: 'lesson-02', order: 2, title: '第2课', status: 'outline_pending', transcript: '正文', outlineVersions: [], nodes: [] }
    ]
    const task = getNextCourseWorkerTask(workflowWith('outline_pending', lessons))
    expect(task.type).toBe('generate-outline')
    expect(task.lessonKey).toBe('lesson-02')

    const waiting = { ...lessons[1], status: 'outline_review', outline: [{ id: 'o1' }] }
    expect(getNextCourseWorkerTask(workflowWith('outline_review', [lessons[0], waiting]))).toEqual(expect.objectContaining({ type: 'idle', reason: 'waiting-outline-approval' }))
  })

  it('routes failed and legacy human review states to automatic revision', () => {
    const node = { id: 'node-1', status: 'node_revision_required', revisionCount: 1, reviewerReports: [{ value: { decision: 'revise', issues: ['覆盖不足'] } }] }
    const lesson = { key: 'lesson-01', order: 1, status: 'node_revision_required', nodes: [node], outline: [], blueprint: {} }
    expect(getNextCourseWorkerTask(workflowWith('node_revision_required', [lesson])).type).toBe('revise-node')
    const legacy = { ...lesson, status: 'node_human_review', nodes: [{ ...node, status: 'node_human_review', revisionCount: 1, humanReviewRequired: true }] }
    expect(getNextCourseWorkerTask(workflowWith('node_human_review', [legacy]))).toEqual(expect.objectContaining({ type: 'revise-node' }))
  })

  it('gives each node enough neighboring context without sending an unbounded chat history', () => {
    const lesson = {
      key: 'lesson-01', order: 1, status: 'node_pending', outline: [], blueprint: {},
      nodes: [
        { id: 'node-1', title: '前一节点', status: 'node_approved', draft: '已经确认的前一节点正文。', writerBrief: {} },
        { id: 'node-2', title: '当前节点', status: 'node_pending', versions: [], reviewerReports: [], writerBrief: { currentNodeGoal: '解释当前规则' } },
        { id: 'node-3', title: '下一节点', status: 'node_pending', writerBrief: { currentNodeGoal: '进入案例分析' } }
      ]
    }
    const task = getNextCourseWorkerTask(workflowWith('node_pending', [lesson]))
    expect(task.node.writerBrief.previousNodeSummary).toContain('前一节点正文')
    expect(task.node.writerBrief.nextNodeTarget).toBe('进入案例分析')
  })

  it('claims automatic final review and resumes legacy unconditional human gates without duplicating a current report', () => {
    const finalLesson = {
      key: 'lesson-01', order: 1, title: '第1课', status: 'final_review',
      nodes: [], finalNote: { markdown: '# 最终笔记' }, finalNoteVersions: [{ value: '# 最终笔记' }], finalReviewReports: []
    }
    expect(getNextCourseWorkerTask(workflowWith('final_review', [finalLesson]))).toEqual(expect.objectContaining({ type: 'final-review' }))

    const legacy = { ...finalLesson, status: 'final_review_human' }
    expect(getNextCourseWorkerTask(workflowWith('final_review_human', [legacy]))).toEqual(expect.objectContaining({ type: 'final-review' }))

    const exceptional = {
      ...legacy,
      finalReviewAttention: { code: 'source-conflict', message: '来源冲突' },
      finalReviewReports: [{ value: { decision: 'human_review', reviewedDraftVersion: 1 } }]
    }
    expect(getNextCourseWorkerTask(workflowWith('final_review_human', [exceptional]))).toEqual(expect.objectContaining({
      type: 'reconcile-final-review',
      qualityReport: expect.objectContaining({ decision: 'human_review' })
    }))

    const currentApproved = {
      ...finalLesson,
      finalReviewReports: [{ value: { decision: 'approve', reviewedDraftVersion: 1 } }]
    }
    expect(getNextCourseWorkerTask(workflowWith('final_review', [currentApproved]))).toEqual(expect.objectContaining({
      type: 'reconcile-final-review',
      qualityReport: expect.objectContaining({ decision: 'approve' })
    }))
  })

})
