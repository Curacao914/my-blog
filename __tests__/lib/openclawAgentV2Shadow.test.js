import { buildAgentProfile } from '@/lib/openclaw/agent-v2/config'
import { buildRoutePlan } from '@/lib/openclaw/agent-v2/planner'
import { evaluateSemanticGate } from '@/lib/openclaw/agent-v2/semanticGate'
import { resolveEntities } from '@/lib/openclaw/agent-v2/entityResolver'
import {
  interpretSessionControl,
  interpretUserIntentWithSession
} from '@/lib/openclaw/agent-v2/interpreter'
import {
  attachOpenClawAgentV2Shadow,
  runOpenClawAgentV2Shadow
} from '@/lib/openclaw/agent-v2/shadowRunner'

function intent(patch = {}) {
  return {
    version: '2.0', intentId: 'intent-1', action: 'read', domain: 'schedule',
    objectType: 'schedule_item', scope: 'list',
    slots: { requestMode: 'execute', additionalActions: [], values: [] },
    contextReferences: [], uncertainties: [], ...patch
  }
}

describe('OpenClaw Agent v2 shadow runtime', () => {
  it('derives capability, risk and execution decision in code', () => {
    const profile = buildAgentProfile()
    const plan = buildRoutePlan({ intent: intent(), profile })
    expect(plan.capabilityId).toBe('schedule.read')
    expect(plan.querySpec.resource).toBe('schedule.items')
    const gate = evaluateSemanticGate({
      intent: intent(), plan,
      resolution: { status: 'collection' }
    })
    expect(gate).toEqual(expect.objectContaining({
      decision: 'would_execute', executionAllowed: false, shadowOnly: true, risk: 'read'
    }))
  })

  it('never authorizes destructive intent and requires code-owned confirmation', () => {
    const profile = buildAgentProfile({ capabilities: { 'schedule.delete': true } })
    const value = intent({ action: 'delete', scope: 'matching' })
    const plan = buildRoutePlan({ intent: value, profile })
    const gate = evaluateSemanticGate({
      intent: value, plan,
      resolution: { status: 'resolved' }
    })
    expect(gate.risk).toBe('destructive')
    expect(gate.confirmationRequired).toBe(true)
    expect(gate.executionAllowed).toBe(false)
    expect(gate.reasons).toContain('confirmation_required')
  })

  it('blocks compound requests and writes missing deterministic inputs', () => {
    const profile = buildAgentProfile({
      capabilities: { 'schedule.create': true, 'schedule.update': true }
    })
    const create = intent({
      action: 'create', scope: 'single',
      slots: { requestMode: 'execute', additionalActions: ['read'], values: [] }
    })
    const createPlan = buildRoutePlan({ intent: create, profile })
    expect(evaluateSemanticGate({ intent: create, plan: createPlan }).reasons)
      .toEqual(expect.arrayContaining([
        'compound_request', 'missing_create_title', 'missing_schedule_time'
      ]))
  })

  it('resolves structured context and ordinal references only from existing session objects', () => {
    const focused = { id: 'schedule-1', type: 'schedule', title: '答辩准备' }
    expect(resolveEntities({
      intent: intent({
        action: 'update', scope: 'selected',
        contextReferences: [{ kind: 'deictic', value: '这个' }]
      }),
      sessionState: { activeFocus: focused }
    })).toEqual(expect.objectContaining({
      status: 'resolved', selected: focused, provenance: 'active_focus'
    }))
    expect(resolveEntities({
      intent: intent({
        action: 'update', domain: 'reading', objectType: 'reading_item', scope: 'selected',
        contextReferences: [{ kind: 'deictic', value: '这个' }]
      }),
      sessionState: { activeFocus: focused }
    }).status).toBe('missing')
  })

  it('resolves a natural ordinal against the current resource result without selected scope', () => {
    const candidates = [
      { id: 'schedule-1', type: 'schedule', title: '第一项' },
      { id: 'schedule-2', type: 'schedule', title: '第二项' }
    ]
    expect(resolveEntities({
      intent: intent({
        scope: 'single',
        slots: {
          requestMode: 'execute', additionalActions: [],
          values: [{ key: 'ordinal', value: '2' }]
        },
        contextReferences: [{ kind: 'ordinal', value: '2' }]
      }),
      candidates
    })).toEqual(expect.objectContaining({
      status: 'resolved', selected: candidates[1], provenance: 'resource_ordinal'
    }))
  })

  it('handles confirmation, cancellation and ordinal selection with zero model calls', async () => {
    expect(interpretSessionControl({
      text: '确认', messageId: 'm1', sessionState: { pendingConfirmation: { id: 'p1' } }
    }).action).toBe('confirm')
    expect(interpretSessionControl({
      text: '不用了', messageId: 'm2', sessionState: { pendingConfirmation: { id: 'p1' } }
    }).action).toBe('cancel')
    const fetchImpl = jest.fn()
    const selected = await interpretUserIntentWithSession({
      text: '就选第二项', messageId: 'm3',
      sessionState: { resultSet: [{ id: 'one' }, { id: 'two' }] },
      fetchImpl
    })
    expect(selected.source).toBe('session_control')
    expect(selected.intent.action).toBe('select')
    expect(selected.usage).toEqual({ inputTokens: 0, outputTokens: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects model-originated session control without matching session state', () => {
    const profile = buildAgentProfile()
    const confirm = intent({
      action: 'confirm', domain: 'agent', objectType: 'agent', scope: 'single'
    })
    const confirmPlan = buildRoutePlan({ intent: confirm, profile })
    expect(evaluateSemanticGate({ intent: confirm, plan: confirmPlan }).reasons)
      .toContain('no_pending_confirmation')

    const select = intent({
      action: 'select', domain: 'agent', objectType: 'agent', scope: 'selected'
    })
    const selectPlan = buildRoutePlan({ intent: select, profile })
    expect(evaluateSemanticGate({
      intent: select,
      plan: selectPlan,
      resolution: { status: 'missing' }
    }).reasons).toContain('entity_missing')
  })

  it('reads a published profile, observes resources and records a trace without a Tool dependency', async () => {
    const profile = buildAgentProfile()
    const saveTrace = jest.fn().mockResolvedValue({ id: 'trace-1' })
    const result = await runOpenClawAgentV2Shadow({
      ownerId: 'owner-1', profile: { id: 'owner-1' }, senderId: 'sender',
      threadId: 'thread', messageId: 'message-1', message: '查看安排',
      legacyPayload: { ok: true, action: 'query', replyText: 'legacy' },
      dependencies: {
        listAgentConfigs: jest.fn().mockResolvedValue([{
          id: 'config-1', status: 'published', version_number: 3, profile
        }]),
        resolveUserAiConfig: jest.fn().mockResolvedValue({
          apiKey: 'secret', baseUrl: 'https://api.example.test/v1',
          models: { router: 'model' }, pricing: {}
        }),
        interpretUserIntent: jest.fn().mockResolvedValue({
          intent: intent(), usage: { inputTokens: 10, outputTokens: 5 },
          estimatedUsd: 0, budgetExceeded: false, latencyMs: 5
        }),
        executeResourceQuery: jest.fn().mockResolvedValue([]),
        saveTrace
      }
    })
    expect(result.status).toBe('recorded')
    expect(saveTrace).toHaveBeenCalledWith(expect.objectContaining({
      configId: 'config-1', configVersion: 3,
      gate: expect.objectContaining({ executionAllowed: false })
    }))
  })

  it('leaves the legacy response untouched and schedules in the background', async () => {
    process.env.OPENCLAW_AGENT_V2_SHADOW_ENABLED = 'true'
    const payload = { ok: true, replyText: 'legacy' }
    const json = jest.fn(value => value)
    const scheduled = []
    const runner = jest.fn().mockResolvedValue({ status: 'recorded' })
    const res = { json }
    expect(attachOpenClawAgentV2Shadow({
      req: {}, res,
      context: { messageId: 'm1', message: 'text' },
      schedule: promise => scheduled.push(promise),
      runner
    })).toBe(true)
    expect(res.json(payload)).toBe(payload)
    await Promise.all(scheduled)
    expect(json).toHaveBeenCalledWith(payload)
    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ legacyPayload: payload }))
    delete process.env.OPENCLAW_AGENT_V2_SHADOW_ENABLED
  })
})
