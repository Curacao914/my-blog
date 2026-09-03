import collectionHandler from '@/pages/api/courses/pipeline'
import taskHandler from '@/pages/api/courses/pipeline/[replayKey]'
import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import {
  discoverCoursePipelineTasks,
  getCoursePipelineTask,
  listCoursePipelineTasks,
  retryCoursePipelineTask,
  updateCoursePipelineTaskStage
} from '@/lib/course/pipelineRepository'

jest.mock('@/lib/auth/coursePipelineAccess', () => ({
  requireCoursePipelineAccess: jest.fn()
}))

jest.mock('@/lib/course/pipelineRepository', () => ({
  discoverCoursePipelineTasks: jest.fn(),
  getCoursePipelineTask: jest.fn(),
  listCoursePipelineTasks: jest.fn(),
  retryCoursePipelineTask: jest.fn(),
  updateCoursePipelineTaskStage: jest.fn()
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

describe('course pipeline control plane API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('lists only the server-derived owner tasks', async () => {
    requireCoursePipelineAccess.mockResolvedValue({
      ok: true,
      ownerId: 'profile-1',
      via: 'workspace'
    })
    listCoursePipelineTasks.mockResolvedValue({
      tasks: [{ replay_key: 'r1' }],
      summary: { total: 1 }
    })

    const req = {
      method: 'GET',
      query: { ownerId: 'spoofed-owner' },
      headers: {}
    }
    const res = response()
    await collectionHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(listCoursePipelineTasks).toHaveBeenCalledWith(
      'profile-1',
      expect.any(Object)
    )
  })

  test('discovers all worker-provided replays', async () => {
    requireCoursePipelineAccess.mockResolvedValue({
      ok: true,
      ownerId: 'profile-1',
      via: 'course-worker'
    })
    discoverCoursePipelineTasks.mockResolvedValue({
      received: 2,
      added: [{ replay_key: 'r1' }, { replay_key: 'r2' }],
      addedCount: 2
    })

    const req = {
      method: 'POST',
      body: {
        replays: [{ replayKey: 'r1' }, { replayKey: 'r2' }]
      },
      headers: {}
    }
    const res = response()
    await collectionHandler(req, res)

    expect(res.statusCode).toBe(201)
    expect(discoverCoursePipelineTasks).toHaveBeenCalledWith(
      'profile-1',
      req.body
    )
  })

  test('allows only the worker to report a stage', async () => {
    requireCoursePipelineAccess.mockResolvedValue({
      ok: true,
      ownerId: 'profile-1',
      via: 'course-worker'
    })
    updateCoursePipelineTaskStage.mockResolvedValue({
      replay_key: 'r1',
      stage: 'transcribing'
    })

    const req = {
      method: 'PATCH',
      query: { replayKey: 'r1' },
      body: { stage: 'transcribing' },
      headers: {}
    }
    const res = response()
    await taskHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(requireCoursePipelineAccess).toHaveBeenCalledWith(
      req,
      { workerOnly: true }
    )
  })

  test('lets the signed-in owner retry a task', async () => {
    requireCoursePipelineAccess.mockResolvedValue({
      ok: true,
      ownerId: 'profile-1',
      via: 'workspace'
    })
    retryCoursePipelineTask.mockResolvedValue({
      replay_key: 'r1',
      stage: 'queued'
    })

    const req = {
      method: 'POST',
      query: { replayKey: 'r1' },
      body: { action: 'retry' },
      headers: {}
    }
    const res = response()
    await taskHandler(req, res)

    expect(res.statusCode).toBe(200)
    expect(retryCoursePipelineTask).toHaveBeenCalledWith(
      'profile-1',
      'r1',
      'manual-retry'
    )
  })
})
