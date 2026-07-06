import {
  buildIntentEvaluationMessages,
  interpretEvaluationCase,
  runFixedSetEvaluation
} from '@/lib/openclaw/agent-v2/evaluation/modelEvaluator'

function toolMessage(value) {
  return {
    tool_calls: [{
      type: 'function',
      function: {
        name: 'emit_intent_frame',
        arguments: typeof value === 'string' ? value : JSON.stringify(value)
      }
    }]
  }
}

function modelFrame(patch = {}) {
  return {
    version: '1.0', operation: 'read', objectType: 'schedule_item',
    quantity: 'many', lookup: 'filters', collectionState: 'any',
    slots: { requestMode: 'execute', additionalActions: [], values: [] },
    contextReferences: [], uncertainties: [], ...patch
  }
}

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
    expect(messages[0].content).toContain('semantic evidence')
    expect(messages[0].content).toContain('Routing fields are compiled by code')
    expect(messages[0].content).toContain('uncertainties')
    expect(messages[0].content).toContain('contextReferences and uncertainties must be JSON arrays')
    expect(messages[0].content).toContain('kind and value')
    expect(messages[0].content).toContain('field and reason')
    expect(messages[0].content).toContain('Quantity is one, many, or all')
    expect(messages[0].content).toContain('mark_read only applies to course_brief')
    expect(messages[0].content).toContain('reading_item represents user-saved')
    expect(messages[0].content).toContain('Use identity only for an identity-bearing')
    expect(messages[0].content).toContain('requestMode')
    expect(messages[0].content).toContain('additionalActions')
    expect(messages[0].content).not.toContain('请查看今天的安排')
    expect(messages[0].content).toContain('Do not make authorization')
    expect(messages[1]).toEqual({ role: 'user', content: item.input })
  })

  it('validates model JSON and derives execution eligibility in code', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: toolMessage(modelFrame()) }],
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
      slots: { requestMode: 'execute', additionalActions: [], values: [] },
      contextReferences: [],
      executionAllowed: true
    }))
    expect(result.inputTokens).toBe(100)
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer secret')
    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(requestBody.thinking).toEqual({ type: 'disabled' })
    expect(requestBody.tool_choice).toEqual({
      type: 'function', function: { name: 'emit_intent_frame' }
    })
    expect(requestBody.tools).toEqual([
      expect.objectContaining({
        function: expect.objectContaining({
          name: 'emit_intent_frame',
          strict: true,
          parameters: expect.objectContaining({ additionalProperties: false })
        })
      })
    ])
    expect(requestBody.response_format).toBeUndefined()
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.example.test/v1/chat/completions')
  })

  it('enforces the configured timeout and output-token ceiling on every model call', async () => {
    const fetchImpl = jest.fn().mockImplementation((_url, options) => {
      expect(options.signal).toBeInstanceOf(AbortSignal)
      expect(JSON.parse(options.body).max_tokens).toBe(321)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: toolMessage(modelFrame()) }]
        })
      })
    })
    await interpretEvaluationCase({
      item,
      profile: {
        capabilities: { 'schedule.read': true },
        budgets: { maxOutputTokens: 321, timeoutMs: 4321 }
      },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'm'
      },
      fetchImpl
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('does not guess when model output is invalid', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: toolMessage('not json') }] })
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

  it('rejects content-only JSON instead of falling back from forced serialization', async () => {
    const content = JSON.stringify({
      version: '2.0',
      intentId: 'v2-test',
      action: 'read',
      domain: 'schedule',
      objectType: 'schedule_item',
      scope: 'list',
      slots: { requestMode: 'execute', additionalActions: [], values: [] },
      contextReferences: [],
      uncertainties: []
    })
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: `\`\`\`json\n${content}\n\`\`\`` } }]
      })
    })
    await expect(interpretEvaluationCase({
      item,
      profile: { capabilities: { 'schedule.read': true } },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'm'
      },
      fetchImpl
    })).rejects.toThrow(/structured/i)
  })

  it('marks a model call that exceeds the configured per-message budget', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: toolMessage(modelFrame()) }],
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

  it('allows uncertain reads but blocks negated or secondary write requests in code', async () => {
    const responseFor = slots => ({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: toolMessage(modelFrame({
          slots,
          uncertainties: [{ field: 'date', reason: '相对日期需解析' }]
        })) }]
      })
    })
    const base = {
      item,
      profile: { capabilities: { 'schedule.read': true } },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'm',
        inputUsdPerMillion: 1, outputUsdPerMillion: 1
      }
    }
    const uncertainRead = await interpretEvaluationCase({
      ...base,
      fetchImpl: jest.fn().mockResolvedValue(responseFor({
        requestMode: 'execute', additionalActions: [], values: []
      }))
    })
    const negated = await interpretEvaluationCase({
      ...base,
      fetchImpl: jest.fn().mockResolvedValue(responseFor({
        requestMode: 'negated', additionalActions: [], values: []
      }))
    })
    const secondaryWrite = await interpretEvaluationCase({
      ...base,
      fetchImpl: jest.fn().mockResolvedValue(responseFor({
        requestMode: 'execute', additionalActions: ['delete'], values: []
      }))
    })
    expect(uncertainRead.actual.executionAllowed).toBe(true)
    expect(negated.actual.executionAllowed).toBe(false)
    expect(secondaryWrite.actual.executionAllowed).toBe(false)
  })

  it('marks token ceilings as budget failures even when price metadata is absent', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: toolMessage(modelFrame()) }],
        usage: { prompt_tokens: 6001, completion_tokens: 10 }
      })
    })
    const result = await interpretEvaluationCase({
      item,
      profile: {
        capabilities: { 'schedule.read': true },
        budgets: {
          maxInputTokens: 6000,
          maxOutputTokens: 800,
          maxEstimatedUsd: 0.01
        }
      },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'm'
      },
      fetchImpl
    })
    expect(result.estimatedUsd).toBe(0)
    expect(result.budgetExceeded).toBe(true)
  })

  it('uses conservative built-in pricing when provider metadata is absent', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: toolMessage(modelFrame()) }],
        usage: { prompt_tokens: 1000, completion_tokens: 1000 }
      })
    })
    const result = await interpretEvaluationCase({
      item,
      profile: {
        capabilities: { 'schedule.read': true },
        budgets: { maxEstimatedUsd: 0.01, maxOutputTokens: 1200 }
      },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash'
      },
      fetchImpl
    })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.deepseek.com/beta/chat/completions')
    expect(result.estimatedUsd).toBeCloseTo(0.00042, 8)
    expect(result.pricingUnknown).toBe(false)
    expect(result.budgetExceeded).toBe(false)
  })

  it('fails the budget gate when usage has no trusted price', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: toolMessage(modelFrame()) }],
        usage: { prompt_tokens: 100, completion_tokens: 30 }
      })
    })
    const result = await interpretEvaluationCase({
      item,
      profile: { capabilities: { 'schedule.read': true } },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'unknown-model'
      },
      fetchImpl
    })
    expect(result.pricingUnknown).toBe(true)
    expect(result.budgetExceeded).toBe(true)
  })

  it('records a failed case and continues the fixed set without guessing', async () => {
    const fetchImpl = jest.fn()
      .mockRejectedValueOnce(new Error('provider unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: toolMessage(modelFrame()) }]
        })
      })
    const second = { ...item, id: 'v2-test-2' }
    const results = await runFixedSetEvaluation({
      cases: [item, second],
      profile: { capabilities: { 'schedule.read': true } },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.example.test/v1', model: 'm'
      },
      concurrency: 1,
      fetchImpl
    })
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual(expect.objectContaining({
      caseId: 'v2-test',
      modelError: 'provider unavailable',
      actual: expect.objectContaining({ executionAllowed: false })
    }))
    expect(results[1]).toEqual(expect.objectContaining({
      caseId: 'v2-test-2',
      modelError: null
    }))
  })
})
