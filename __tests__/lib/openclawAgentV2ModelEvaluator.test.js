import {
  buildIntentEvaluationMessages,
  interpretEvaluationCase
} from '@/lib/openclaw/agent-v2/evaluation/modelEvaluator'

describe('OpenClaw Agent v2 model evaluator', () => {
  const item = {
    id: 'v2-test',
    input: '请查看今天的安排',
    expected: {
      action: 'read',
      domain: 'schedule',
      objectType: 'schedule_item',
      scope: 'list',
      executionAllowed: true
    }
  }

  it('uses a fixed schema instruction without training examples or execution authority', () => {
    const messages = buildIntentEvaluationMessages(item)
    expect(messages[0].content).toContain('UserIntent v2')
    expect(messages[0].content).not.toContain('请查看今天的安排')
    expect(messages[0].content).not.toMatch(/capability|SQL|tool/i)
    expect(messages[1]).toEqual({ role: 'user', content: item.input })
  })

  it('validates model JSON and derives execution eligibility in code', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: JSON.stringify({
          version: '2.0',
          intentId: 'v2-test',
          action: 'read',
          domain: 'schedule',
          objectType: 'schedule_item',
          scope: 'list',
          slots: {},
          contextReferences: [],
          uncertainties: []
        }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 30 }
      })
    })
    const result = await interpretEvaluationCase({
      item,
      profile: { capabilities: { 'schedule.read': true } },
      modelConfig: {
        apiKey: 'secret',
        baseUrl: 'https://api.example.test/v1',
        model: 'model-1'
      },
      fetchImpl
    })
    expect(result.actual).toEqual(expect.objectContaining({
      domain: 'schedule',
      executionAllowed: true
    }))
    expect(result.inputTokens).toBe(100)
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer secret')
  })

  it('does not guess when model output is invalid', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'not json' } }] })
    })
    await expect(interpretEvaluationCase({
      item,
      profile: { capabilities: { 'schedule.read': true } },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'm'
      },
      fetchImpl
    })).rejects.toThrow(/json/i)
  })

  it('marks a model call that exceeds the configured per-message budget', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: JSON.stringify({
          version: '2.0', intentId: 'v2-test', action: 'read',
          domain: 'schedule', objectType: 'schedule_item', scope: 'list',
          slots: {}, contextReferences: [], uncertainties: []
        }) } }],
        usage: { prompt_tokens: 1000, completion_tokens: 1000 }
      })
    })
    const result = await interpretEvaluationCase({
      item,
      profile: {
        capabilities: { 'schedule.read': true },
        budgets: { maxEstimatedUsd: 0.001 }
      },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'm',
        inputUsdPerMillion: 10, outputUsdPerMillion: 10
      },
      fetchImpl
    })
    expect(result.budgetExceeded).toBe(true)
  })
})
