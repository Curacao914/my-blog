import { compileModelIntentFrame } from '@/lib/openclaw/agent-v2/intentCompiler'
import { interpretUserIntent } from '@/lib/openclaw/agent-v2/interpreter'

function frame(patch = {}) {
  return {
    version: '1.0',
    operation: 'read',
    objectType: 'schedule_item',
    quantity: 'one',
    lookup: 'latest',
    collectionState: 'any',
    slots: { requestMode: 'execute', additionalActions: [], values: [] },
    contextReferences: [],
    uncertainties: [],
    ...patch
  }
}

describe('OpenClaw Agent v2 intent compiler', () => {
  it('derives domain and singular scope from code-owned mappings', () => {
    expect(compileModelIntentFrame(frame(), { intentId: 'intent-1' }))
      .toEqual(expect.objectContaining({
        version: '2.0', intentId: 'intent-1', action: 'read',
        domain: 'schedule', objectType: 'schedule_item', scope: 'single'
      }))
  })

  it.each([
    [
      { objectType: 'reading_item', quantity: 'many', lookup: 'filters' },
      { domain: 'reading', scope: 'list' }
    ],
    [
      { objectType: 'course', quantity: 'many', lookup: 'identity' },
      { domain: 'course', scope: 'matching' }
    ],
    [
      {
        objectType: 'course_brief', quantity: 'all', lookup: 'filters',
        collectionState: 'unread',
        slots: {
          requestMode: 'execute', additionalActions: [],
          values: [{ key: 'read_state', value: 'unread' }]
        }
      },
      { domain: 'course', scope: 'all_unread' }
    ],
    [
      { objectType: 'reading_item', quantity: 'one', lookup: 'context' },
      { domain: 'reading', scope: 'single' }
    ],
    [
      { operation: 'help', objectType: 'agent', quantity: 'one', lookup: 'none' },
      { domain: 'agent', scope: 'none' }
    ]
  ])('compiles semantic evidence %j into stable routing %j', (patch, expected) => {
    expect(compileModelIntentFrame(frame(patch), { intentId: 'intent-2' }))
      .toEqual(expect.objectContaining(expected))
  })

  it('does not turn a filtered unread collection into all_unread without all quantity', () => {
    const intent = compileModelIntentFrame(frame({
      objectType: 'course_brief', quantity: 'many', lookup: 'filters',
      slots: {
        requestMode: 'execute', additionalActions: [],
        values: [{ key: 'read_state', value: 'unread' }]
      }
    }), { intentId: 'intent-3' })
    expect(intent.scope).toBe('list')
  })

  it('materializes collection state as a canonical resource filter', () => {
    const intent = compileModelIntentFrame(frame({
      objectType: 'course_brief', quantity: 'one', lookup: 'latest',
      collectionState: 'unread'
    }), { intentId: 'intent-state' })
    expect(intent.slots.values).toContainEqual({ key: 'read_state', value: 'unread' })
  })

  it('rejects inconsistent write cardinality and incompatible operations', () => {
    expect(compileModelIntentFrame(frame({
      operation: 'create', objectType: 'reading_item', quantity: 'one', lookup: 'none'
    }), { intentId: 'intent-4' }).scope).toBe('single')
    expect(() => compileModelIntentFrame(frame({
      operation: 'create', objectType: 'reading_item', quantity: 'many', lookup: 'none'
    }), { intentId: 'intent-5' })).toThrow(/quantity/i)
    expect(() => compileModelIntentFrame(frame({
      operation: 'mark_read', objectType: 'reading_item'
    }), { intentId: 'intent-6' })).toThrow(/course_brief/i)
  })

  it('uses constrained semantic-frame decoding and compiles the final UserIntent in code', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { tool_calls: [{ function: {
          name: 'emit_intent_frame',
          arguments: JSON.stringify(frame({
            objectType: 'course_brief', quantity: 'one', lookup: 'latest',
            collectionState: 'unread'
          }))
        } }] } }],
        usage: { prompt_tokens: 100, completion_tokens: 40 }
      })
    })
    const result = await interpretUserIntent({
      text: '查看最新未读课程简报',
      profile: { budgets: {
        timeoutMs: 1000, maxInputTokens: 6000,
        maxOutputTokens: 800, maxEstimatedUsd: 0.01
      } },
      modelConfig: {
        apiKey: 'secret', baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash', inputUsdPerMillion: 0.1,
        outputUsdPerMillion: 0.2
      },
      fetchImpl
    })
    expect(result.intent).toEqual(expect.objectContaining({
      action: 'read', domain: 'course', objectType: 'course_brief', scope: 'single'
    }))
    const request = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(request.tools[0].function.parameters.properties).not.toHaveProperty('scope')
    expect(request.tools[0].function.parameters.properties).not.toHaveProperty('domain')
  })
})
