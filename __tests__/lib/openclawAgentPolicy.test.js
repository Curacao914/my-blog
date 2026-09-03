import { evaluateRiskPolicy } from '@/lib/openclaw/agent/policy'
import { capabilityRegistry } from '@/lib/openclaw/agent/capabilities'

describe('OpenClaw Agent risk policy', () => {
  test('does not allow a target write without a real target', () => {
    const card = capabilityRegistry.get('schedule.update')
    expect(evaluateRiskPolicy({
      plan: {
        scope: 'single',
        parameters: { patch: { time: '10:00' } }
      },
      card,
      targets: []
    }).decision).toBe('clarify')
  })

  test('requires explicit confirmation for delete', () => {
    const card = capabilityRegistry.get('schedule.delete')
    expect(evaluateRiskPolicy({
      plan: {
        scope: 'single',
        parameters: {}
      },
      card,
      targets: [{ id: '1' }]
    }).decision).toBe('confirm')
  })

  test('allows explicitly scoped reversible bulk course writes', () => {
    const card = capabilityRegistry.get('course.brief.mark_read')
    const decision = evaluateRiskPolicy({
      plan: {
        scope: 'all_unread',
        parameters: {}
      },
      card,
      targets: [{ id: '1' }, { id: '2' }]
    })
    expect(decision.decision).toBe('allow')
  })

  test('rejects exact-time WeChat reminder fields', () => {
    const card = capabilityRegistry.get('schedule.create')
    const decision = evaluateRiskPolicy({
      plan: {
        scope: 'single',
        parameters: {
          item: {
            title: '开会',
            reminders: [{
              remindAt: '2026-07-04 10:00',
              channel: 'wechat'
            }]
          }
        }
      },
      card,
      targets: []
    })
    expect(decision.decision).toBe('deny')
    expect(decision.reason).toBe(
      'exact_wechat_reminder_not_supported'
    )
  })
})
