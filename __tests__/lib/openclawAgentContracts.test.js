import {
  buildMutationSpec,
  normalizeRoutePlan,
  validateRoutePlan
} from '@/lib/openclaw/agent/contracts'
import {
  capabilityRegistry,
  CAPABILITY_CARDS
} from '@/lib/openclaw/agent/capabilities'

describe('OpenClaw Agent stable contracts', () => {
  test('normalizes and validates a registered RoutePlan', () => {
    const plan = normalizeRoutePlan({
      version: 1,
      decision: 'act',
      domain: 'course',
      capability: 'course.brief.mark_read',
      operation: 'mark_read',
      scope: 'all_unread',
      target: {
        filters: { read: false }
      },
      risk: 'bulk_write',
      confidence: 0.98,
      needsRetrieval: true
    })
    expect(validateRoutePlan(plan, capabilityRegistry)).toEqual({
      ok: true,
      errors: [],
      plan
    })
  })

  test('rejects a capability that is not registered', () => {
    const result = validateRoutePlan({
      version: 1,
      decision: 'act',
      domain: 'schedule',
      capability: 'database.free_sql',
      operation: 'execute',
      scope: 'single',
      confidence: 1
    }, capabilityRegistry)
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('unknown_capability')
  })

  test('MutationSpec contains only a named tool and structured values', () => {
    expect(buildMutationSpec({
      tool: 'schedule.update',
      targetIds: ['a', 'a', 'b'],
      patch: { time: '10:00' },
      idempotencyKey: 'message-1'
    })).toEqual({
      version: 1,
      tool: 'schedule.update',
      targetIds: ['a', 'b'],
      patch: { time: '10:00' },
      preconditions: {},
      create: {},
      idempotencyKey: 'message-1'
    })
  })

  test('capability ids are unique and cover all first-stage domains', () => {
    expect(capabilityRegistry.size).toBe(CAPABILITY_CARDS.length)
    const domains = new Set(CAPABILITY_CARDS.map(card => card.domain))
    expect(domains).toEqual(new Set([
      'agent',
      'schedule',
      'reading',
      'course'
    ]))
  })
})
