import { runCourseWorkerBatch } from '@/lib/course/runBatch'
import { applyCourseWorkflowActionsForWorker, claimCourseWorkerTasks } from '@/lib/courseRepository'
import { executeCourseTask } from '@/lib/course/onlineRunner'

jest.mock('@/lib/course/onlineRunner', () => ({ executeCourseTask: jest.fn() }))
jest.mock('@/lib/courseRepository', () => ({
  applyCourseWorkflowActionsForWorker: jest.fn(),
  claimCourseWorkerTasks: jest.fn(),
  getCourseJobById: jest.fn()
}))

describe('automatic outline approval', () => {
  test('appends a worker approval after a generated outline', async () => {
    claimCourseWorkerTasks.mockResolvedValue({
      workflow: { courseSpec: { autoApproveOutline: true } },
      tasks: [{ type: 'generate-outline', lessonKey: 'lesson-1', taskKey: 'outline-1' }]
    })
    executeCourseTask.mockResolvedValue({
      type: 'save-outline',
      lessonKey: 'lesson-1',
      outline: [{ id: 'a', title: 'A' }],
      taskKey: 'outline-1'
    })
    applyCourseWorkflowActionsForWorker.mockResolvedValue({ workflow: { status: 'outline_approved' } })

    await runCourseWorkerBatch('job-1', {
      modelConfig: { apiKey: 'key', costControl: { mode: 'immediate' } }
    })

    expect(applyCourseWorkflowActionsForWorker).toHaveBeenCalledWith('job-1', [
      expect.objectContaining({ type: 'save-outline' }),
      { type: 'approve-outline-worker', lessonKey: 'lesson-1' }
    ])
  })
})
