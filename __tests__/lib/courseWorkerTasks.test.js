import { getNextCourseWorkerTask } from '@/lib/course/workerTasks'

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

  it('routes failed review to revision and caps automatic loops', () => {
    const node = { id: 'node-1', status: 'node_revision_required', revisionCount: 1, reviewerReports: [{ value: { decision: 'revise', issues: ['覆盖不足'] } }] }
    const lesson = { key: 'lesson-01', order: 1, status: 'node_revision_required', nodes: [node], outline: [], blueprint: {} }
    expect(getNextCourseWorkerTask(workflowWith('node_revision_required', [lesson])).type).toBe('revise-node')
    const capped = { ...lesson, nodes: [{ ...node, revisionCount: 2 }] }
    expect(getNextCourseWorkerTask(workflowWith('node_revision_required', [capped]))).toEqual(expect.objectContaining({ type: 'idle', reason: 'waiting-node-human-review' }))
  })
})
