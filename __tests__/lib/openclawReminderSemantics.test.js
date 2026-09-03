import { buildReminderForItem } from '@/lib/domain/reminders'

describe('explicit reminder semantics', () => {
  it('does not create a precise reminder unless the user requested one', () => {
    expect(buildReminderForItem({
      id: 'task-1',
      title: '吃饭',
      date: '2026-07-03',
      time: '18:00',
      status: 'active'
    }, 'owner-1')).toBeNull()
  })

  it('keeps the event time separate from an advance WeChat reminder', () => {
    const reminder = buildReminderForItem({
      id: 'task-2',
      title: '面试',
      date: '2026-07-03',
      time: '09:00',
      status: 'active',
      reminder: {
        enabled: true,
        mode: 'before',
        leadMinutes: 60,
        remindAt: '2026-07-03T00:00:00.000Z',
        channel: 'wechat'
      }
    }, 'owner-1')

    expect(reminder).toMatchObject({
      channel: 'wechat',
      remind_at: '2026-07-03T00:00:00.000Z',
      payload: {
        date: '2026-07-03',
        time: '09:00',
        leadMinutes: 60,
        reminderMode: 'before'
      }
    })
  })
})
