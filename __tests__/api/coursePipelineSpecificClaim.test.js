import handler from '@/pages/api/courses/pipeline/[replayKey]/claim'
import {
  requireCoursePipelineAccess
} from '@/lib/auth/coursePipelineAccess'
import {
  claimSpecificCoursePipelineTask
} from '@/lib/course/pipelineLeaseRepository'

jest.mock('@/lib/auth/coursePipelineAccess', () => ({
  requireCoursePipelineAccess:
    jest.fn()
}))

jest.mock('@/lib/course/pipelineLeaseRepository', () => ({
  claimSpecificCoursePipelineTask:
    jest.fn()
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

describe('specific course pipeline claim API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireCoursePipelineAccess
      .mockResolvedValue({
        ok: true,
        ownerId: 'owner-1',
        via: 'course-worker'
      })
  })

  test('claims only the requested replay', async () => {
    claimSpecificCoursePipelineTask
      .mockResolvedValue({
        replay_key: 'replay-1'
      })

    const req = {
      method: 'POST',
      query: {
        replayKey: 'replay-1'
      },
      body: {
        workerId: 'e2e-worker',
        leaseSeconds: 1800
      },
      headers: {}
    }
    const res = response()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(
      claimSpecificCoursePipelineTask
    ).toHaveBeenCalledWith(
      'owner-1',
      'replay-1',
      req.body
    )
  })

  test('returns conflict for a leased or non-actionable replay', async () => {
    claimSpecificCoursePipelineTask
      .mockResolvedValue(null)

    const req = {
      method: 'POST',
      query: {
        replayKey: 'replay-1'
      },
      body: {
        workerId: 'e2e-worker'
      },
      headers: {}
    }
    const res = response()
    await handler(req, res)

    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe(
      'course_pipeline_task_unavailable'
    )
  })
})
