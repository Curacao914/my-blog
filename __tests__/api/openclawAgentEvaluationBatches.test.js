import evaluateHandler from '@/pages/api/settings/openclaw-agent/evaluate'

import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { runFixedSetEvaluation } from '@/lib/openclaw/agent-v2/evaluation/modelEvaluator'
import { findAgentConfig } from '@/lib/server/openclawAgentConfigs'
import {
  completeEvaluationRun,
  createEvaluationRun,
  getEvaluationRun,
  saveEvaluationRunProgress,
  syncFixedEvaluationCases
} from '@/lib/server/openclawAgentEvaluations'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

jest.mock('@/lib/auth/serverAdmin', () => ({ requireWorkspaceRequest: jest.fn() }))
jest.mock('@/lib/openclaw/agent-v2/evaluation', () => ({
  FIXED_EVALUATION_CASES: Array.from({ length: 25 }, (_, index) => ({
    id: `case-${index + 1}`,
    input: `input-${index + 1}`,
    expected: {}
  }))
}))
jest.mock('@/lib/openclaw/agent-v2/evaluation/modelEvaluator', () => ({
  runFixedSetEvaluation: jest.fn()
}))
jest.mock('@/lib/server/openclawAgentConfigs', () => ({
  agentStudioAuthorized: auth => Boolean(auth?.isOwner && !auth?.impersonating),
  findAgentConfig: jest.fn()
}))
jest.mock('@/lib/server/openclawAgentEvaluations', () => ({
  completeEvaluationRun: jest.fn(),
  createEvaluationRun: jest.fn(),
  failEvaluationRun: jest.fn(),
  getEvaluationRun: jest.fn(),
  saveEvaluationRunProgress: jest.fn(),
  syncFixedEvaluationCases: jest.fn()
}))
jest.mock('@/lib/server/userIntegrations', () => ({ resolveUserAiConfig: jest.fn() }))

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

const auth = {
  ok: true,
  isOwner: true,
  impersonating: false,
  actorProfile: { id: 'owner-1', role: 'owner' }
}
const profile = {
  models: { interpreter: 'deepseek-v4-pro' },
  capabilities: { 'schedule.read': true },
  budgets: {}
}

describe('/api/settings/openclaw-agent/evaluate batching', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireWorkspaceRequest.mockResolvedValue(auth)
    findAgentConfig.mockResolvedValue({
      id: 'config-1', owner_id: 'owner-1', status: 'draft', profile
    })
    resolveUserAiConfig.mockResolvedValue({
      apiKey: 'secret', baseUrl: 'https://model.test/v1', pricing: {}
    })
  })

  it('starts a run and persists only one bounded batch', async () => {
    createEvaluationRun.mockResolvedValue({ id: 'run-1', results: [] })
    runFixedSetEvaluation.mockImplementation(({ cases }) => Promise.resolve(
      cases.map(item => ({ caseId: item.id, actual: {}, expected: item.expected }))
    ))
    saveEvaluationRunProgress.mockResolvedValue({
      id: 'run-1', status: 'running', case_count: 24
    })
    const res = response()
    await evaluateHandler({
      method: 'POST',
      body: { environment: 'preview', configId: 'config-1' }
    }, res)
    expect(res.statusCode).toBe(202)
    expect(runFixedSetEvaluation.mock.calls[0][0].cases).toHaveLength(24)
    expect(saveEvaluationRunProgress).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1',
      expectedCaseCount: 0,
      results: expect.arrayContaining([expect.objectContaining({ caseId: 'case-1' })])
    }))
    expect(completeEvaluationRun).not.toHaveBeenCalled()
    expect(res.body).toEqual(expect.objectContaining({ done: false, completedCases: 24, totalCases: 25 }))
  })

  it('resumes a running ledger and completes the final batch', async () => {
    const existing = Array.from({ length: 24 }, (_, index) => ({
      caseId: `case-${index + 1}`, actual: {}, deterministic: {}
    }))
    getEvaluationRun.mockResolvedValue({
      id: 'run-1', config_id: 'config-1', model: 'deepseek-v4-pro',
      status: 'running', results: existing
    })
    runFixedSetEvaluation.mockResolvedValue([{
      caseId: 'case-25', actual: {}, expected: {}
    }])
    completeEvaluationRun.mockResolvedValue({
      id: 'run-1', status: 'passed', case_count: 25
    })
    const res = response()
    await evaluateHandler({
      method: 'POST',
      body: { environment: 'preview', configId: 'config-1', runId: 'run-1' }
    }, res)
    expect(runFixedSetEvaluation.mock.calls[0][0].cases).toHaveLength(1)
    expect(completeEvaluationRun).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-1',
      results: expect.arrayContaining([
        expect.objectContaining({ caseId: 'case-1' }),
        expect.objectContaining({ caseId: 'case-25' })
      ])
    }))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(expect.objectContaining({ done: true }))
  })
})
