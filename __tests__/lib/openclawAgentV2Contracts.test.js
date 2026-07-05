import {
  AGENT_V2_CONTRACT_VERSION,
  validateCapabilityCard,
  validateMutationSpec,
  validateQuerySpec,
  validateResourceDescriptor,
  validateRiskPolicy,
  validateRoutePlan,
  validateSessionState,
  validateToolDescriptor,
  validateToolResult,
  validateUserIntent
} from '@/lib/openclaw/agent-v2/contracts'

describe('OpenClaw Agent v2 stable contracts', () => {
  const intent = {
    version: '2.0',
    intentId: 'intent-1',
    action: 'read',
    domain: 'schedule',
    objectType: 'schedule_item',
    scope: 'single',
    slots: { date: '2026-07-04' },
    contextReferences: [],
    uncertainties: []
  }

  it('accepts a model-owned UserIntent without execution authority', () => {
    expect(AGENT_V2_CONTRACT_VERSION).toBe('2.0')
    expect(validateUserIntent(intent)).toEqual(intent)
  })

  it.each(['capability', 'tool', 'sql', 'risk', 'riskLevel', 'query']) (
    'rejects model output containing forbidden field %s',
    field => {
      expect(() => validateUserIntent({ ...intent, [field]: 'forbidden' }))
        .toThrow(/forbidden/i)
    }
  )

  it('rejects forbidden execution fields nested inside model-owned slots', () => {
    expect(() => validateUserIntent({
      ...intent,
      slots: { date: '2026-07-04', sql: 'delete from schedule_items' }
    })).toThrow(/forbidden/i)
  })

  it('allows a natural-language query slot without granting QuerySpec authority', () => {
    expect(validateUserIntent({
      ...intent,
      domain: 'reading',
      objectType: 'reading_item',
      scope: 'matching',
      slots: { query: '人工智能治理' }
    }).slots.query).toBe('人工智能治理')
    expect(() => validateUserIntent({ ...intent, query: { resource: 'schedule_items' } }))
      .toThrow(/forbidden/i)
    expect(() => validateUserIntent({
      ...intent,
      slots: { query: { resource: 'schedule_items' } }
    })).toThrow(/slots.query/i)
  })

  it('requires stable context-reference and uncertainty item shapes', () => {
    expect(validateUserIntent({
      ...intent,
      contextReferences: [{ kind: 'deictic', value: '这个' }],
      uncertainties: [{ field: 'target', reason: '缺少可解析对象' }]
    })).toEqual(expect.objectContaining({
      contextReferences: [{ kind: 'deictic', value: '这个' }],
      uncertainties: [{ field: 'target', reason: '缺少可解析对象' }]
    }))
    expect(() => validateUserIntent({
      ...intent,
      contextReferences: ['这个']
    })).toThrow(/contextReferences/i)
    expect(() => validateUserIntent({
      ...intent,
      uncertainties: ['不确定']
    })).toThrow(/uncertainties/i)
  })

  it('rejects semantically inconsistent intent fields', () => {
    expect(() => validateUserIntent({
      ...intent,
      domain: 'course',
      objectType: 'schedule_item'
    })).toThrow(/objectType/i)
  })

  it('validates code-owned RoutePlan, QuerySpec and MutationSpec', () => {
    const query = validateQuerySpec({
      version: '2.0',
      resource: 'schedule_items',
      filters: [{ field: 'status', op: 'eq', value: 'active' }],
      sort: [{ field: 'starts_at', direction: 'asc' }],
      limit: 20,
      cursor: null
    })
    const mutation = validateMutationSpec({
      version: '2.0',
      tool: 'schedule.update',
      targetIds: ['schedule-1'],
      create: null,
      patch: { startsAt: '2026-07-04T10:00:00+08:00' },
      expectedVersions: { 'schedule-1': 'v1' },
      preconditions: [{ type: 'target_exists', targetId: 'schedule-1' }],
      idempotencyKey: 'message-1:schedule.update:schedule-1',
      traceId: 'trace-1'
    })
    expect(query.resource).toBe('schedule_items')
    expect(mutation.tool).toBe('schedule.update')
    expect(() => validateMutationSpec({ ...mutation, sql: 'delete from x' }))
      .toThrow(/forbidden/i)

    expect(validateRoutePlan({
      version: '2.0',
      planId: 'plan-1',
      intentId: intent.intentId,
      capabilityId: 'schedule.read',
      capabilityVersion: '2.0',
      querySpec: query,
      resolution: { required: true, objectType: 'schedule_item' },
      steps: [{ type: 'query', resource: query.resource }],
      clarification: null
    }).intentId).toBe(intent.intentId)
  })

  it('keeps risk and confirmation immutable in Capability Cards', () => {
    const card = validateCapabilityCard({
      version: '2.0',
      id: 'schedule.delete',
      domain: 'schedule',
      actions: ['delete'],
      objectTypes: ['schedule_item'],
      scopes: ['single'],
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      resource: 'schedule_items',
      tool: 'schedule.delete',
      risk: 'destructive',
      confirmation: 'required',
      idempotent: true
    })
    expect(card.risk).toBe('destructive')
    expect(card.confirmation).toBe('required')
  })

  it('validates structured context provenance and per-reference expiry', () => {
    expect(validateSessionState({
      version: '2.0',
      activeFocus: { domain: 'schedule', objectType: 'schedule_item' },
      references: [{
        kind: 'last_created',
        objectType: 'schedule_item',
        objectIds: ['schedule-1'],
        sourceMessageId: 'message-1',
        provenance: 'tool_result',
        expiresAt: '2026-07-04T13:00:00+08:00'
      }],
      resultSet: [],
      pendingConfirmation: null,
      configVersion: 'config-1'
    }).references).toHaveLength(1)
  })

  it('defines Resource and Tool by explicit schemas and field allowlists', () => {
    expect(validateResourceDescriptor({
      version: '2.0',
      id: 'schedule_items',
      domain: 'schedule',
      objectType: 'schedule_item',
      filterFields: ['status', 'starts_at', 'title'],
      sortFields: ['starts_at', 'updated_at'],
      maximumLimit: 100
    }).id).toBe('schedule_items')
    expect(validateToolDescriptor({
      version: '2.0',
      id: 'schedule.update',
      domain: 'schedule',
      objectType: 'schedule_item',
      createFields: [],
      patchFields: ['title', 'startsAt'],
      risk: 'reversible_write',
      confirmation: 'none',
      idempotent: true
    }).patchFields).toContain('startsAt')
  })

  it('keeps RiskPolicy code-owned and ToolResult grounded in before/after', () => {
    const policy = validateRiskPolicy({
      version: '2.0',
      levels: {
        read: { confirmation: 'none' },
        reversible_write: { confirmation: 'none' },
        bulk_write: { confirmation: 'required' },
        destructive: { confirmation: 'required' },
        privileged: { confirmation: 'required' }
      }
    })
    expect(policy.levels.destructive.confirmation).toBe('required')
    expect(() => validateRiskPolicy({
      ...policy,
      levels: { ...policy.levels, destructive: { confirmation: 'none' } }
    })).toThrow(/confirmation/i)
    expect(validateToolResult({
      version: '2.0',
      status: 'succeeded',
      affectedIds: ['schedule-1'],
      before: [{ id: 'schedule-1', startsAt: '09:00' }],
      after: [{ id: 'schedule-1', startsAt: '10:00' }],
      failures: [],
      undo: { tool: 'schedule.update', expiresAt: null }
    }).status).toBe('succeeded')
  })
})
