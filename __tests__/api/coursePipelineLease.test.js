import claimHandler from '@/pages/api/courses/pipeline/claim'
import heartbeatHandler from '@/pages/api/courses/pipeline/[replayKey]/heartbeat'
import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import {
  claimCoursePipelineTask,
  heartbeatCoursePipelineTask
} from '@/lib/course/pipelineLeaseRepository'

jest.mock('@/lib/auth/coursePipelineAccess', () => ({
  requireCoursePipelineAccess: jest.fn()
}))

jest.mock('@/lib/course/pipelineLeaseRepository', () => ({
  claimCoursePipelineTask: jest.fn(),
  heartbeatCoursePipelineTask: jest.fn()
}))

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
      return this
    }
  }
}

describe('course pipeline lease API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireCoursePipelineAccess.mockResolvedValue({
      ok: true,
      ownerId: 'owner-1',
      via: 'course-worker'
    })
  })

  test('returns idle when the queue has no claimable task', async () => {
    claimCoursePipelineTask.mockResolvedValue(null)

    const req = {
      method: 'POST',
      body: {
        workerId: 'worker-1',
        leaseSeconds: 900
      },
      headers: {}
    }
    const res = response()
    await claimHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.idle).toBe(true)
    expect(requireCoursePipelineAccess)
      .toHaveBeenCalledWith(
        req,
        { workerOnly: true }
      )
  })

  test('returns conflict when the heartbeat loses its lease', async () => {
    heartbeatCoursePipelineTask.mockResolvedValue(null)

    const req = {
      method: 'POST',
      query: { replayKey: 'r1' },
      body: {
        workerId: 'worker-1',
        leaseSeconds: 900
      },
      headers: {}
    }
    const res = response()
    await heartbeatHandler(req, res)

    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe(
      'course_pipeline_lease_lost'
    )
  })
})
