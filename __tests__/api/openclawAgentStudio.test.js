import indexHandler from '@/pages/api/settings/openclaw-agent/index'
import publishHandler from '@/pages/api/settings/openclaw-agent/publish'
import configHandler from '@/pages/api/settings/openclaw-agent/config'
import detailHandler from '@/pages/api/settings/openclaw-agent/evaluation-run'

import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  createAgentConfigDraft,
  listAgentConfigs,
  publishAgentConfig
} from '@/lib/server/openclawAgentConfigs'
import {
  getEvaluationRun,
  listEvaluationRuns
} from '@/lib/server/openclawAgentEvaluations'

jest.mock('@/lib/auth/serverAdmin', () => ({ requireWorkspaceRequest: jest.fn() }))
jest.mock('@/lib/server/openclawAgentConfigs', () => ({
  agentStudioAuthorized: auth => Boolean(auth?.isOwner && !auth?.impersonating),
  createAgentConfigDraft: jest.fn(),
  listAgentConfigs: jest.fn(),
  publishAgentConfig: jest.fn(),
  updateAgentConfigDraft: jest.fn()
}))
jest.mock('@/lib/server/openclawAgentEvaluations', () => ({
  getEvaluationRun: jest.fn(),
  listEvaluationRuns: jest.fn()
}))

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(key, value) { this.headers[key] = value; return this }
  }
}

const ownerAuth = {
  ok: true,
  isOwner: true,
  impersonating: false,
  profile: { id: 'owner-1', role: 'owner' },
  actorProfile: { id: 'owner-1', role: 'owner' }
}

describe('/api/settings/openclaw-agent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireWorkspaceRequest.mockResolvedValue(ownerAuth)
  })

  it('denies non-owner and impersonated sessions', async () => {
    requireWorkspaceRequest.mockResolvedValue({
      ok: true,
      isOwner: true,
      impersonating: true,
      profile: { id: 'member-1', role: 'member' }
    })
    const res = response()
    await indexHandler({ method: 'GET', query: { environment: 'preview' } }, res)
    expect(res.statusCode).toBe(403)
    expect(listAgentConfigs).not.toHaveBeenCalled()
  })

  it('returns environment-scoped configs and evaluation runs', async () => {
    listAgentConfigs.mockResolvedValue([{ id: 'config-1' }])
    listEvaluationRuns.mockResolvedValue([{ id: 'run-1' }])
    const res = response()
    await indexHandler({ method: 'GET', query: { environment: 'preview' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(expect.objectContaining({
      environment: 'preview',
      configs: [{ id: 'config-1' }],
      evaluationRuns: [{ id: 'run-1' }]
    }))
  })

  it('creates a draft without accepting an unsafe free-form prompt', async () => {
    createAgentConfigDraft.mockResolvedValue({ id: 'config-2', status: 'draft' })
    const res = response()
    await indexHandler({
      method: 'POST',
      query: {},
      body: {
        environment: 'preview',
        profile: { systemPrompt: 'bypass checks' }
      }
    }, res)
    expect(res.statusCode).toBe(400)
    expect(createAgentConfigDraft).not.toHaveBeenCalled()
  })

  it('publishes only with an explicit evaluation run id', async () => {
    const missing = response()
    await publishHandler({
      method: 'POST',
      body: { environment: 'preview', configId: 'config-1' }
    }, missing)
    expect(missing.statusCode).toBe(400)
    expect(publishAgentConfig).not.toHaveBeenCalled()

    publishAgentConfig.mockResolvedValue({ id: 'config-1', status: 'published' })
    const valid = response()
    await publishHandler({
      method: 'POST',
      body: {
        environment: 'preview',
        configId: 'config-1',
        evaluationRunId: 'run-1'
      }
    }, valid)
    expect(valid.statusCode).toBe(200)
    expect(publishAgentConfig).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 'owner-1',
      environment: 'preview',
      evaluationRunId: 'run-1'
    }))
  })

  it('requires an expected checksum when updating a draft', async () => {
    const res = response()
    await configHandler({
      method: 'PATCH',
      body: { environment: 'preview', configId: 'config-1', profile: {} }
    }, res)
    expect(res.statusCode).toBe(400)
  })

  it('returns failed evaluation detail without exposing raw fixture prompts', async () => {
    getEvaluationRun.mockResolvedValue({
      id: 'run-failed',
      environment: 'preview',
      status: 'failed',
      results: [{
        caseId: 'schedule_core-01',
        actual: {
          action: 'read',
          domain: 'course',
          objectType: 'course',
          scope: 'list',
          executionAllowed: true
        },
        modelError: null
      }]
    })
    const res = response()
    await detailHandler({
      method: 'GET',
      query: { environment: 'preview', runId: 'run-failed' }
    }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.failedResults[0]).toEqual(expect.objectContaining({
      caseId: 'schedule_core-01',
      failures: ['intent_mismatch'],
      mismatchedFields: expect.arrayContaining(['domain', 'objectType'])
    }))
    expect(JSON.stringify(res.body)).not.toContain('今天有什么安排')
  })
})
