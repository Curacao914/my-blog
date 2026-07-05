import {
  completeEvaluationRun,
  createEvaluationRun,
  listEvaluationRuns,
  syncFixedEvaluationCases
} from '@/lib/server/openclawAgentEvaluations'
import { encryptUserSecret } from '@/lib/server/secretCrypto'
import { supabaseRest } from '@/lib/server/supabase'

jest.mock('@/lib/server/secretCrypto', () => ({
  encryptUserSecret: jest.fn(value => ({
    ciphertext: `encrypted:${value.length}`,
    iv: 'iv',
    tag: 'tag'
  }))
}))
jest.mock('@/lib/server/supabase', () => ({ supabaseRest: jest.fn() }))

describe('OpenClaw Agent evaluation persistence', () => {
  beforeEach(() => jest.clearAllMocks())

  it('encrypts every fixed-set input before upsert', async () => {
    supabaseRest.mockResolvedValue([{ id: 'case-1' }])
    await syncFixedEvaluationCases({
      ownerId: 'owner-1',
      environment: 'preview'
    })
    expect(encryptUserSecret).toHaveBeenCalledTimes(150)
    const payload = JSON.parse(supabaseRest.mock.calls[0][1].body)
    expect(payload).toHaveLength(150)
    expect(payload[0]).not.toHaveProperty('input')
    expect(payload[0]).toEqual(expect.objectContaining({
      input_ciphertext: expect.stringMatching(/^encrypted:/),
      input_iv: 'iv',
      input_tag: 'tag'
    }))
  })

  it('creates an environment-scoped running evaluation', async () => {
    supabaseRest.mockResolvedValue([{ id: 'run-1', status: 'running' }])
    const run = await createEvaluationRun({
      ownerId: 'owner-1',
      environment: 'preview',
      configId: 'config-1',
      model: 'deepseek/deepseek-v4-flash'
    })
    expect(run.status).toBe('running')
    expect(JSON.parse(supabaseRest.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        owner_id: 'owner-1',
        environment: 'preview',
        config_id: 'config-1'
      })
    )
  })

  it('persists a passed report only when the deterministic gate passes', async () => {
    supabaseRest.mockResolvedValue([{ id: 'run-1', status: 'passed' }])
    const results = Array.from({ length: 150 }, (_, index) => ({
      caseId: `v2-${index}`,
      expected: {
        action: 'read', domain: 'schedule', objectType: 'schedule_item',
        scope: 'list', executionAllowed: true
      },
      actual: {
        action: 'read', domain: 'schedule', objectType: 'schedule_item',
        scope: 'list', executionAllowed: true
      },
      inputTokens: 10,
      outputTokens: 5,
      estimatedUsd: 0.0001,
      latencyMs: 20
    }))
    const row = await completeEvaluationRun({
      ownerId: 'owner-1',
      environment: 'preview',
      runId: 'run-1',
      results
    })
    expect(row.status).toBe('passed')
    const payload = JSON.parse(supabaseRest.mock.calls[0][1].body)
    expect(payload).toEqual(expect.objectContaining({
      status: 'passed',
      case_count: 150,
      overall_score: 1,
      safety_score: 1
    }))
    expect(payload.results[0]).toEqual({
      caseId: 'v2-0',
      actual: results[0].actual,
      deterministic: {
        intent: true,
        safety: true,
        responseQuality: 0
      },
      modelError: null,
      budgetExceeded: false,
      pricingUnknown: false,
      inputTokens: 10,
      outputTokens: 5,
      estimatedUsd: 0.0001,
      latencyMs: 20
    })
  })

  it('persists bounded structured failure evidence without raw messages', async () => {
    supabaseRest.mockResolvedValue([{ id: 'run-1', status: 'failed' }])
    await completeEvaluationRun({
      ownerId: 'owner-1',
      environment: 'preview',
      runId: 'run-1',
      results: [{
        caseId: 'case-1',
        expected: { action: 'read', executionAllowed: true },
        actual: {
          version: '2.0', intentId: 'intent-1', action: 'create',
          domain: 'reading', objectType: 'reading_item', scope: 'single',
          slots: { query: '平台治理' }, contextReferences: [], uncertainties: [],
          executionAllowed: false,
          ignored: 'must not persist'
        },
        modelError: 'x'.repeat(500),
        budgetExceeded: true,
        pricingUnknown: true,
        inputTokens: 12,
        outputTokens: 34,
        estimatedUsd: 0.001,
        latencyMs: 56,
        rawInput: 'secret message'
      }]
    })
    const payload = JSON.parse(supabaseRest.mock.calls[0][1].body)
    expect(payload.results[0]).toEqual(expect.objectContaining({
      caseId: 'case-1',
      modelError: 'x'.repeat(300),
      budgetExceeded: true,
      pricingUnknown: true,
      inputTokens: 12,
      outputTokens: 34,
      estimatedUsd: 0.001,
      latencyMs: 56,
      actual: expect.not.objectContaining({ ignored: expect.anything() })
    }))
    expect(JSON.stringify(payload.results)).not.toContain('secret message')
  })

  it('returns compact failure evidence while leaving persisted detail intact', async () => {
    supabaseRest.mockResolvedValue([{
      id: 'run-failed',
      status: 'failed',
      failure_categories: [
        { caseId: 'a', category: 'model_error', message: 'invalid JSON' },
        { caseId: 'b', category: 'model_error', message: 'invalid JSON' },
        { caseId: 'a', category: 'intent_mismatch', critical: true }
      ]
    }])
    const runs = await listEvaluationRuns({
      ownerId: 'owner-1',
      environment: 'preview'
    })
    expect(runs[0].failure_categories).toEqual([
      { category: 'model_error', count: 2, critical: false, message: 'invalid JSON' },
      { category: 'intent_mismatch', count: 1, critical: true }
    ])
    expect(supabaseRest.mock.results[0].value).toBeDefined()
  })
})
