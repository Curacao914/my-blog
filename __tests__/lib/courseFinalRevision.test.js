import {
  requestFinalNoteRevision,
  saveFinalNoteRevision
} from '@/lib/course/workflowState'
import { getNextCourseWorkerTasks } from '@/lib/course/workerTasks'

function fixture() {
  return {
    status: 'final_review_human',
    currentStep: 'final_review',
    progress: 90,
    steps: [],
    courseSpec: { courseName: '数据法', promptVersion: 'test' },
    lessons: [{
      key: 'lesson-1',
      order: 1,
      title: '第一课',
      status: 'final_review_human',
      nodes: [{ id: 'node-1', status: 'node_approved' }],
      finalNote: { markdown: '# 第一课\n\n原始正文。', updatedAt: '2026-06-27T00:00:00.000Z' },
      finalNoteVersions: [{ version: 1, value: '# 第一课\n\n原始正文。' }],
      finalRevisionRequests: [],
      finalReviewReports: []
    }]
  }
}

describe('user-controlled final note revision', () => {
  it('queues one final revision only after explicit user feedback', () => {
    const workflow = requestFinalNoteRevision(fixture(), 'lesson-1', '补足第二部分，其余不变。')
    expect(workflow.status).toBe('final_revision_required')
    expect(workflow.lessons[0].finalRevisionRequests).toHaveLength(1)
    expect(getNextCourseWorkerTasks(workflow)[0]).toMatchObject({
      type: 'revise-final-note',
      lessonKey: 'lesson-1'
    })
  })

  it('returns to human confirmation after the revision result is saved', () => {
    const queued = requestFinalNoteRevision(fixture(), 'lesson-1', '补足第二部分。')
    const revised = saveFinalNoteRevision(queued, 'lesson-1', '# 第一课\n\n修订后的正文。')
    expect(revised.status).toBe('final_review_human')
    expect(revised.lessons[0].finalNote.markdown).toContain('修订后的正文')
    expect(revised.lessons[0].finalNoteVersions.at(-1).source).toBe('final-revision')
  })
})
