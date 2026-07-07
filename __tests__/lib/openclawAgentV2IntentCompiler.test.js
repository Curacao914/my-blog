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

  it('uses identity-bearing slots to constrain named targets', () => {
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

  it('prunes empty context reference values before strict validation', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'update',
      objectType: 'schedule_item',
      quantity: 'one',
      lookup: 'latest',
      contextReferences: [
        { kind: 'previous_result', value: '' }
      ],
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'new_time', value: '10:00' }]
      }
    }), { intentId: 'intent-empty-context' })
    expect(intent).toEqual(expect.objectContaining({
      action: 'update', domain: 'schedule', objectType: 'schedule_item', scope: 'single'
    }))
    expect(intent.contextReferences).toEqual([])
  })

  it('normalizes non-help agent frames before validation', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'update',
      objectType: 'agent',
      quantity: 'one',
      lookup: 'filters',
      uncertainties: [{ field: 'objectType', reason: '用户试图伪装对象类型，实际语义是阅读修改' }]
    }), { intentId: 'intent-agent-update' })
    expect(intent).toEqual(expect.objectContaining({
      action: 'update', domain: 'reading', objectType: 'reading_item', scope: 'matching'
    }))
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
      action: 'update', domain: 'reading', objectType: 'reading_item', scope: 'matching'
    }))
  })

  it('accepts direct reading mark-read evidence as a reading update', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'mark_read',
      objectType: 'reading_item',
      quantity: 'one',
      lookup: 'context',
      contextReferences: [{ kind: 'previous_result', value: '文章' }],
      slots: {
        requestMode: 'negated',
        additionalActions: [],
        values: []
      }
    }), { intentId: 'intent-reading-direct-mark-read' })
    expect(intent).toEqual(expect.objectContaining({
      action: 'update', domain: 'reading', objectType: 'reading_item', scope: 'single'
    }))
  })

  it('downgrades single unread brief mark-read evidence to a safe read', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'mark_read',
      objectType: 'course_brief',
      quantity: 'one',
      lookup: 'latest',
      collectionState: 'unread',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'read_state', value: 'unread' }]
      }
    }), { intentId: 'intent-safe-unread-brief-read' })
    expect(intent).toEqual(expect.objectContaining({
      action: 'read', domain: 'course', objectType: 'course_brief', scope: 'single'
    }))
  })

  it('keeps true bulk course brief mark-read operations write-shaped', () => {
    const intent = compileModelIntentFrame(frame({
      operation: 'mark_read',
      objectType: 'course_brief',
      quantity: 'all',
      lookup: 'filters',
      collectionState: 'unread',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'read_state', value: 'unread' }]
      }
    }), { intentId: 'intent-bulk-brief-mark-read' })
    expect(intent).toEqual(expect.objectContaining({
      action: 'mark_read', domain: 'course', objectType: 'course_brief', scope: 'all_unread'
    }))
  })

  it('routes unqualified course brief reads without unread state to course records', () => {
    const intent = compileModelIntentFrame(frame({
      objectType: 'course_brief',
      quantity: 'one',
      lookup: 'latest',
      collectionState: 'any'
    }), { intentId: 'intent-course-not-brief' })
    expect(intent).toEqual(expect.objectContaining({
      action: 'read', domain: 'course', objectType: 'course', scope: 'single'
    }))
  })

  it('treats course status filters as lists except named or recent failure targets', () => {
    expect(compileModelIntentFrame(frame({
      objectType: 'course',
      quantity: 'many',
      lookup: 'filters',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'status', value: '需要注意' }]
      }
    }), { intentId: 'intent-course-status-attention' }).scope).toBe('matching')

    expect(compileModelIntentFrame(frame({
      objectType: 'course',
      quantity: 'many',
      lookup: 'filters',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'status', value: '已完成' }]
      }
    }), { intentId: 'intent-course-status-list' }).scope).toBe('list')

    expect(compileModelIntentFrame(frame({
      objectType: 'course',
      quantity: 'one',
      lookup: 'filters',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [{ key: 'status', value: 'failed' }]
      }
    }), { intentId: 'intent-course-failed-single' }).scope).toBe('single')

    expect(compileModelIntentFrame(frame({
      objectType: 'course',
      quantity: 'many',
      lookup: 'filters',
      slots: {
        requestMode: 'execute',
        additionalActions: ['delete'],
        values: []
      }
    }), { intentId: 'intent-course-cross-domain-delete' }).scope).toBe('matching')
  })

  it('keeps context-anchored writes singular unless ambiguity requires matching', () => {
    expect(compileModelIntentFrame(frame({
      operation: 'delete',
      objectType: 'reading_item',
      quantity: 'one',
      lookup: 'filters',
      contextReferences: [{ kind: 'last_created', value: 'reading_item' }]
    }), { intentId: 'intent-context-single' }).scope).toBe('single')

    expect(compileModelIntentFrame(frame({
      operation: 'update',
      objectType: 'reading_item',
      quantity: 'one',
      lookup: 'context',
      contextReferences: [{ kind: 'deictic', value: '把文章改一下' }],
      uncertainties: [{ field: 'operation', reason: '改一下语义模糊，需要澄清修改字段' }]
    }), { intentId: 'intent-context-ambiguous-reading' }).scope).toBe('matching')
  })

  it('keeps date-constrained schedule deletion matching and date search list-like', () => {
    expect(compileModelIntentFrame(frame({
      operation: 'delete',
      objectType: 'schedule_item',
      quantity: 'one',
      lookup: 'identity',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [
          { key: 'title', value: '开题讨论' },
          { key: 'date', value: 'tomorrow' }
        ]
      }
    }), { intentId: 'intent-date-delete' }).scope).toBe('matching')

    expect(compileModelIntentFrame(frame({
      objectType: 'schedule_item',
      quantity: 'many',
      lookup: 'filters',
      slots: {
        requestMode: 'execute',
        additionalActions: [],
        values: [
          { key: 'date', value: '10号' },
          { key: 'query', value: '安排' }
        ]
      }
    }), { intentId: 'intent-date-query-list' }).scope).toBe('list')
  })

  it('separates secondary delete signals from primary update semantics', () => {
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
      action: 'update', scope: 'matching'
    }))

    expect(compileModelIntentFrame(frame({
      operation: 'update',
      objectType: 'schedule_item',
      quantity: 'one',
      lookup: 'context',
      slots: {
        requestMode: 'execute',
        additionalActions: ['delete'],
        values: [
          { key: 'tag', value: 'read' },
          { key: 'new_title', value: 'read' }
        ]
      }
    }), { intentId: 'intent-malicious-read-delete' })).toEqual(expect.objectContaining({
      action: 'delete', scope: 'single'
    }))
  })

  it('rejects inconsistent create cardinality', () => {
    expect(compileModelIntentFrame(frame({
      operation: 'create', objectType: 'reading_item', quantity: 'one', lookup: 'none'
    }), { intentId: 'intent-4' }).scope).toBe('single')
    expect(() => compileModelIntentFrame(frame({
      operation: 'create', objectType: 'reading_item', quantity: 'many', lookup: 'none'
    }), { intentId: 'intent-5' })).toThrow(/quantity/i)
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
