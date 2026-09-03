import handler from '@/pages/api/courses/jobs/[id]/run-next'
import { courseBatchDirective, runCourseWorkerBatch } from '@/lib/course/runBatch'
import { getTextPackCourseJobForOwner } from '@/lib/courseRepository'

jest.mock('@/lib/auth/courseAccess', () => ({
  requireCourseWorkspace: jest.fn(async () => ({
    ok: true,
    profile: { id: 'profile-course-1', role: 'member', status: 'active' },
    modelConfig: { apiKey: 'member-key', baseUrl: 'https://api.example/v1', models: { writer: 'member-model' } }
  }))
}))

jest.mock('@/lib/course/runBatch', () => ({
  runCourseWorkerBatch: jest.fn(),
  courseBatchDirective: jest.fn(result => result.directive || { nextAction: result.idle ? 'wait' : 'run', reason: result.reason || '', retryAfterMs: 0 })
}))

jest.mock('@/lib/courseRepository', () => ({
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
    getTextPackCourseJobForOwner.mockResolvedValue({ id: 'job-1', owner_id: 'profile-course-1' })
  })

  it('verifies ownership and forwards the current member model configuration', async () => {
    runCourseWorkerBatch.mockResolvedValue({ idle: false, failures: [], completedSteps: ['write-node'], workflow: { status: 'node_pending' } })
    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' }, body: { ownerId: 'forged-owner' } }, res)

    expect(res.statusCode).toBe(200)
    expect(getTextPackCourseJobForOwner).toHaveBeenCalledWith('profile-course-1', 'job-1')
    expect(runCourseWorkerBatch).toHaveBeenCalledWith('job-1', expect.objectContaining({
      leaseSeconds: 240,
      modelConfig: expect.objectContaining({ apiKey: 'member-key' })
    }))
    expect(JSON.stringify(getTextPackCourseJobForOwner.mock.calls[0])).not.toContain('forged-owner')
  })

  it('returns an idle directive at a human gate', async () => {
    runCourseWorkerBatch.mockResolvedValue({ idle: true, reason: 'waiting-outline-approval', failures: [], completedSteps: [], workflow: { status: 'outline_review' } })
    courseBatchDirective.mockReturnValue({ nextAction: 'wait', reason: 'waiting-outline-approval', retryAfterMs: 0 })
    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(expect.objectContaining({ idle: true, nextAction: 'wait', reason: 'waiting-outline-approval' }))
  })

  it('keeps node-level failures partial and returns 200', async () => {
    runCourseWorkerBatch.mockResolvedValue({
      idle: false,
      failures: [{ task: 'write-node', nodeId: 'node-2', error: 'provider timeout' }],
      completedSteps: ['review-node'],
      workflow: { status: 'node_pending' }
    })
    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.partialFailures).toEqual([expect.objectContaining({ task: 'write-node', nodeId: 'node-2' })])
  })

  it('returns 502 for a course-level failure', async () => {
    runCourseWorkerBatch.mockResolvedValue({
      idle: false,
      failures: [{ task: 'assemble', nodeId: null, error: 'splice provider timeout' }],
      completedSteps: [],
      workflow: { status: 'failed' }
    })
    const res = createRes()
    await handler({ method: 'POST', query: { id: 'job-1' } }, res)
    expect(res.statusCode).toBe(502)
    expect(res.body.error).toBe('splice provider timeout')
  })
})
