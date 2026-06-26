import handler from '@/pages/api/courses/jobs/[id]/run-next'
import { executeCourseTask } from '@/lib/course/onlineRunner'
import {
  applyCourseWorkflowActionForWorker,
  claimCourseWorkerTask,
  getTextPackCourseJobForOwner
} from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

jest.mock('@/lib/auth/serverAdmin', () => ({
  getAdminCandidate: jest.fn(() => ({ userId: 'clerk-course-owner' })),
  requireAdminRequest: jest.fn(() => ({ ok: true, via: 'clerk' }))
}))

jest.mock('@/lib/server/supabase', () => ({
  ensureProfile: jest.fn()
}))

jest.mock('@/lib/course/onlineRunner', () => ({
  executeCourseTask: jest.fn()
}))

jest.mock('@/lib/courseRepository', () => ({
  applyCourseWorkflowActionForWorker: jest.fn(),
  claimCourseWorkerTask: jest.fn(),
  getTextPackCourseJobForOwner: jest.fn()
}))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/courses/jobs/[id]/run-next', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ensureProfile.mockResolvedValue({ profile: { id: 'profile-course-1' } })
    getTextPackCourseJobForOwner.mockResolvedValue({ id: 'job-1' })
  })

  it('verifies ownership before claiming and executes exactly one online step', async () => {
    const task = { type: 'generate-outline', lessonKey: 'lesson-01', taskKey: 'outline:lesson-01' }
    claimCourseWorkerTask.mockResolvedValue({ task, workflow: { status: 'outline_pending' } })
    executeCourseTask.mockResolvedValue({ type: 'save-outline', lessonKey: 'lesson-01', outline: [], taskKey: task.taskKey })
    applyCourseWorkflowActionForWorker.mockResolvedValue({ workflow: { status: 'outline_review' } })

    const req = { method: 'POST', query: { id: 'job-1' }, body: { ownerId: 'client-forged-owner' } }
    const res = createRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(getTextPackCourseJobForOwner).toHaveBeenCalledWith('profile-course-1', 'job-1')
    expect(claimCourseWorkerTask).toHaveBeenCalledWith('job-1', 240)
    expect(executeCourseTask).toHaveBeenCalledWith(task)
    expect(applyCourseWorkflowActionForWorker).toHaveBeenCalledWith('job-1', expect.objectContaining({ taskKey: task.taskKey }))
    expect(JSON.stringify(getTextPackCourseJobForOwner.mock.calls[0])).not.toContain('client-forged-owner')
  })

  it('returns an idle state without invoking a model when the workflow is at a human gate', async () => {
    claimCourseWorkerTask.mockResolvedValue({
      task: { type: 'idle', reason: 'waiting-outline-approval' },
      workflow: { status: 'outline_review' }
    })
    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.idle).toBe(true)
    expect(res.body.reason).toBe('waiting-outline-approval')
    expect(executeCourseTask).not.toHaveBeenCalled()
  })

  it('records a technical failure without pretending the step succeeded', async () => {
    const task = { type: 'write-node', lessonKey: 'lesson-01', taskKey: 'writer:node-1' }
    claimCourseWorkerTask.mockResolvedValue({ task, workflow: { status: 'node_pending' } })
    executeCourseTask.mockRejectedValue(new Error('provider timeout'))
    applyCourseWorkflowActionForWorker.mockResolvedValue({ workflow: { status: 'failed' } })

    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)

    expect(res.statusCode).toBe(502)
    expect(res.body.error).toBe('provider timeout')
    expect(applyCourseWorkflowActionForWorker).toHaveBeenCalledWith('job-1', expect.objectContaining({
      type: 'fail-step',
      step: 'write-node',
      retryable: true,
      taskKey: expect.stringMatching(/^writer:node-1:failed:/)
    }))
  })
})
