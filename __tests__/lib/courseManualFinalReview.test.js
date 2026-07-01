import {
  assembleFinalNote,
  completeFinalReview
} from '@/lib/course/workflowState'
import { getNextCourseWorkerTasks } from '@/lib/course/workerTasks'

function workflowFixture() {
  return {
    status: 'assembly_pending',
    currentStep: 'assembly',
    progress: 80,
    steps: [],
    courseSpec: {
      courseName: '测试课程',
      teacher: '教师',
      qualityThreshold: 75
    },
    lessons: [{
      key: 'lesson-1',
      order: 1,
      title: '第一课',
      status: 'assembly_pending',
      blueprint: { mainLine: '课程主线' },
      outline: [{
        id: 'outline-1',
        title: '第一部分',
        rationale: '说明第一部分。',
        concepts: [],
        statutes: [],
        cases: []
      }],
      nodes: [{
        id: 'node-1',
        outlineNodeId: 'outline-1',
        title: '节点一',
        status: 'node_approved',
        draft: '这是已经通过节点审查的正文。',
        versions: [{ version: 1, value: '这是已经通过节点审查的正文。' }],
        concepts: [],
        statutes: [],
        cases: []
      }],
      finalNoteVersions: [],
      finalReviewReports: []
    }]
  }
}

describe('independent final review', () => {
  it('queues an independent final review after assembling the final note', () => {
    const result = assembleFinalNote(workflowFixture(), 'lesson-1', {})

    expect(result.status).toBe('final_review')
    expect(result.lessons[0].status).toBe('final_review')
    expect(result.lessons[0].finalNote.markdown).toContain('已经通过节点审查')
  })

  it('schedules the final-review model task rather than silently completing', () => {
    const workflow = assembleFinalNote(workflowFixture(), 'lesson-1', {})
    expect(getNextCourseWorkerTasks(workflow)[0]).toMatchObject({
      type: 'final-review',
      lessonKey: 'lesson-1'
    })
  })

  it('completes only after the independent final report approves the note', () => {
    const waiting = assembleFinalNote(workflowFixture(), 'lesson-1', {})
    const completed = completeFinalReview(waiting, 'lesson-1', {
      decision: 'approve',
      coverage: 90,
      grounding: 90,
      logic: 90,
      detail: 90,
      sourceCoverage: 90,
      issues: []
    })

    expect(completed.status).toBe('completed')
    expect(completed.lessons[0].status).toBe('completed')
    expect(completed.lessons[0].qualityReport.decision).toBe('approve')
  })
})
