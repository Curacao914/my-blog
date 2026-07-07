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
        objectType: 'course_brief', quantity: 'many', lookup: 'filters',
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

  it('uses identity-bearing slots to avoid collapsing named targets into single', () => {
    const intent = compileModelIntentFrame(frame({
      objectType: 'schedule_item',
      quantity: 'one',
      lookup: 'identity',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'title', value: '民法讨论会' }]
      }
    }), { intentId: 'intent-identity' })
    expect(intent.scope).toBe('matching')
  })

  it('keeps identity-constrained unread brief operations matching instead of bulk', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'mark_read',
      objectType: 'course_brief',
      quantity: 'all',
      lookup: 'filters',
      collectionState: 'unread',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [
          { key: 'teacher_name', value: '张老师' },
          { key: 'read_state', value: 'unread' }
        ]
      }
    }), { intentId: 'intent-matching-unread' })
    expect(intent.scope).toBe('matching')
  })

  it('treats recent collection lookups as lists instead of model errors', () => {
    const intent = compileModelIntentFrame(frame({
      objectType: 'reading_item',
      quantity: 'many',
      lookup: 'latest'
    }), { intentId: 'intent-latest-many' })
    expect(intent.scope).toBe('list')
  })

  it('materializes collection state as a canonical resource filter', () => {
    const intent = compileModelIntentFrame(frame({
      objectType: 'course_brief', quantity: 'one', lookup: 'latest',
      collectionState: 'unread'
    }), { intentId: 'intent-state' })
    expect(intent.slots.values).toContainEqual({ key: 'read_state', value: 'unread' })
  })

  it('normalizes non-executing language and read-before-write ambiguity conservatively', () => {
    expect(compileModelIntentFrame(frame({
      operation: 'delete',
      objectType: 'schedule_item',
      quantity: 'one',
      lookup: 'none',
      slots: { requestMode: 'hypothetical', additionalActions: [], values: [] }
    }), { intentId: 'intent-hypothetical' }).action).toBe('read')

    expect(compileModelIntentFrame(frame({
      operation: 'mark_read',
      objectType: 'course_brief',
      quantity: 'one',
      lookup: 'latest',
      slots: { requestMode: 'execute', additionalActions: ['read'], values: [] }
    }), { intentId: 'intent-read-primary' }).action).toBe('read')
  })

  it('prunes empty linguistic slots before strict validation', () => {
    const intent = compileModelIntentFrame(frame({
      objectType: 'course',
      quantity: 'many',
      lookup: 'filters',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'query', value: '' }]
      }
    }), { intentId: 'intent-empty-slot' })
    expect(intent.slots.values).toEqual([])
  })

  it('normalizes reading mark-read evidence away from course briefs', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'mark_read',
      objectType: 'course_brief',
      quantity: 'one',
      lookup: 'identity',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'title', value: '平台治理' }]
      }
    }), { intentId: 'intent-reading-mark-read' })
    expect(intent).toEqual(expect.objectContaining({
      action: 'update',
      domain: 'reading',
      objectType: 'reading_item',
      scope: 'matching'
    }))
  })

  it('keeps ambiguous course brief mark-read operations at matching scope', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'mark_read',
      objectType: 'course_brief',
      quantity: 'one',
      lookup: 'filters',
      collectionState: 'unread',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'read_state', value: 'unread' }]
      }
    }), { intentId: 'intent-ambiguous-brief-read' })
    expect(intent.scope).toBe('matching')
  })

  it('treats state and cross-domain signals as constrained matching reads', () => {
    expect(compileModelIntentFrame(frame({
      objectType: 'course',
      quantity: 'many',
      lookup: 'filters',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'status', value: '需要注意' }]
      }
    }), { intentId: 'intent-course-status' }).scope).toBe('matching')

    expect(compileModelIntentFrame(frame({
      operation: 'update',
      objectType: 'schedule_item',
      quantity: 'one',
      lookup: 'context',
      slots: {
        requestMode: 'execute',
        additionalActions: ['delete'],
        values: [{ key: 'new_time', value: '10:00' }]
      },
      uncertainties: [{ field: 'lookup', reason: '日程指代不明确' }]
    }), { intentId: 'intent-cross-domain-write' })).toEqual(expect.objectContaining({
      action: 'delete',
      scope: 'matching'
    }))
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
