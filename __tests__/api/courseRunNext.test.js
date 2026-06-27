import handler from '@/pages/api/courses/jobs/[id]/run-next'
import { executeCourseTask } from '@/lib/course/onlineRunner'
import {
  applyCourseWorkflowActionsForWorker,
  claimCourseWorkerTasks,
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
  applyCourseWorkflowActionsForWorker: jest.fn(),
  claimCourseWorkerTasks: jest.fn(),
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

  it('verifies ownership, executes a claimed batch and commits the results together', async () => {
    const tasks = [
      { type: 'write-node', lessonKey: 'lesson-01', node: { id: 'node-3' }, taskKey: 'write:node-3' },
      { type: 'review-node', lessonKey: 'lesson-01', node: { id: 'node-1' }, taskKey: 'review:node-1' },
      { type: 'review-node', lessonKey: 'lesson-01', node: { id: 'node-2' }, taskKey: 'review:node-2' }
    ]
    claimCourseWorkerTasks.mockResolvedValue({ tasks, workflow: { status: 'node_pending' } })
    executeCourseTask.mockImplementation(async task => ({ type: task.type === 'write-node' ? 'save-node-draft-worker' : 'save-node-review', lessonKey: task.lessonKey, nodeId: task.node.id, taskKey: task.taskKey }))
    applyCourseWorkflowActionsForWorker.mockResolvedValue({ workflow: { status: 'node_pending' } })

    const req = { method: 'POST', query: { id: 'job-1' }, body: { ownerId: 'client-forged-owner' } }
    const res = createRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(getTextPackCourseJobForOwner).toHaveBeenCalledWith('profile-course-1', 'job-1')
    expect(claimCourseWorkerTasks).toHaveBeenCalledWith('job-1', 240)
    expect(executeCourseTask).toHaveBeenCalledTimes(3)
    expect(applyCourseWorkflowActionsForWorker).toHaveBeenCalledWith('job-1', expect.arrayContaining([
      expect.objectContaining({ taskKey: 'write:node-3' }),
      expect.objectContaining({ taskKey: 'review:node-1' }),
      expect.objectContaining({ taskKey: 'review:node-2' })
    ]))
    expect(JSON.stringify(getTextPackCourseJobForOwner.mock.calls[0])).not.toContain('client-forged-owner')
  })

  it('returns an idle state without invoking a model at a human gate', async () => {
    claimCourseWorkerTasks.mockResolvedValue({
      tasks: [{ type: 'idle', reason: 'waiting-outline-approval' }],
      workflow: { status: 'outline_review' }
    })
    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.idle).toBe(true)
    expect(res.body.reason).toBe('waiting-outline-approval')
    expect(executeCourseTask).not.toHaveBeenCalled()
  })

  it('isolates a node failure, preserves successful siblings and keeps the course runnable', async () => {
    const tasks = [
      { type: 'write-node', lessonKey: 'lesson-01', node: { id: 'node-2' }, taskKey: 'write:node-2' },
      { type: 'review-node', lessonKey: 'lesson-01', node: { id: 'node-1' }, taskKey: 'review:node-1' }
    ]
    claimCourseWorkerTasks.mockResolvedValue({ tasks, workflow: { status: 'node_pending' } })
    executeCourseTask.mockImplementation(task => task.type === 'write-node'
      ? Promise.reject(new Error('provider timeout'))
      : Promise.resolve({ type: 'save-node-review', lessonKey: task.lessonKey, nodeId: task.node.id, taskKey: task.taskKey }))
    applyCourseWorkflowActionsForWorker.mockResolvedValue({ workflow: { status: 'node_pending' } })

    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.partialFailures).toEqual([expect.objectContaining({ task: 'write-node', nodeId: 'node-2', error: 'provider timeout' })])
    expect(applyCourseWorkflowActionsForWorker).toHaveBeenCalledWith('job-1', expect.arrayContaining([
      expect.objectContaining({ type: 'fail-node-task', nodeId: 'node-2', taskType: 'write-node', taskKey: 'write:node-2' }),
      expect.objectContaining({ type: 'save-node-review', nodeId: 'node-1' })
    ]))
  })

  it('persists a course-level failure and returns 502', async () => {
    const task = { type: 'assemble', lessonKey: 'lesson-01', taskKey: 'assemble:lesson-01' }
    claimCourseWorkerTasks.mockResolvedValue({ tasks: [task], workflow: { status: 'assembly_pending' } })
    executeCourseTask.mockRejectedValue(new Error('splice provider timeout'))
    applyCourseWorkflowActionsForWorker.mockResolvedValue({ workflow: { status: 'failed' } })

    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)

    expect(res.statusCode).toBe(502)
    expect(res.body.error).toBe('splice provider timeout')
    expect(applyCourseWorkflowActionsForWorker).toHaveBeenCalledWith('job-1', [expect.objectContaining({ type: 'fail-step', step: 'assemble' })])
  })
})
