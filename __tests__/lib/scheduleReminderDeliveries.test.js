import {
  buildScheduleReminderDeliverySpecs,
  SCHEDULE_REMINDER_GRACE_MS
} from '@/lib/server/scheduleReminderDeliveries'

describe('schedule reminder deliveries', () => {
  const baseItem = {
    id: '11111111-1111-4111-8111-111111111111',
    title: '面试',
    status: 'active',
    date: '2026-07-03',
    time: '09:00',
    place: '法学院',
    temporal: {
      startsAt: '2026-07-03T09:00:00+08:00'
    }
  }

  it('creates one durable queue item for each WeChat reminder', () => {
    const specs = buildScheduleReminderDeliverySpecs({
      ownerId: 'owner-1',
      item: {
        ...baseItem,
        reminders: [
          {
            enabled: true,
            mode: 'before',
            channel: 'wechat',
            leadMinutes: 60,
            remindAt: '2026-07-03T00:00:00.000Z'
          },
          {
            enabled: true,
            mode: 'before',
            channel: 'wechat',
            leadMinutes: 30,
            remindAt: '2026-07-03T00:30:00.000Z'
          }
        ]
      },
      now: new Date('2026-07-02T07:00:00.000Z')
    })

    expect(specs).toHaveLength(2)
    expect(new Set(specs.map(item => item.dedupeKey)).size).toBe(2)
    expect(specs[0]).toMatchObject({
      purpose: 'schedule-reminder',
      objectType: 'schedule-item',
      scheduledFor: '2026-07-03T00:00:00.000Z'
    })
    expect(specs[0].bodyText).toContain('事项时间：2026-07-03 09:00')
    expect(specs[0].bodyText).toContain('提前1小时')
  })

  it('does not queue completed or materially overdue reminders', () => {
    expect(buildScheduleReminderDeliverySpecs({
      ownerId: 'owner-1',
      item: {
        ...baseItem,
        status: 'done',
        reminders: [{ enabled: true, remindAt: '2026-07-03T00:00:00.000Z' }]
      },
      now: new Date('2026-07-02T07:00:00.000Z')
    })).toEqual([])

    expect(buildScheduleReminderDeliverySpecs({
      ownerId: 'owner-1',
      item: {
        ...baseItem,
        reminders: [{
          enabled: true,
          channel: 'wechat',
          remindAt: '2026-07-02T06:00:00.000Z'
        }]
      },
      now: new Date(
        new Date('2026-07-02T06:00:00.000Z').getTime() +
        SCHEDULE_REMINDER_GRACE_MS +
        1
      )
    })).toEqual([])
  })
})
