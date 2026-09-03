import { fromDbScheduleItem, toDbScheduleItem } from '@/lib/domain/schedule'

describe('schedule reminder persistence', () => {
  const ownerId = '22222222-2222-4222-8222-222222222222'

  it('stores multiple reminders and restores them', () => {
    const row = toDbScheduleItem({
      id: '11111111-1111-4111-8111-111111111111',
      title: '面试',
      date: '2026-07-03',
      time: '09:00',
      reminders: [
        { enabled: true, mode: 'before', leadMinutes: 60, remindAt: '2026-07-03T00:00:00.000Z', channel: 'wechat' },
        { enabled: true, mode: 'before', leadMinutes: 30, remindAt: '2026-07-03T00:30:00.000Z', channel: 'wechat' }
      ],
      reminder: { enabled: true, mode: 'before', leadMinutes: 60, remindAt: '2026-07-03T00:00:00.000Z', channel: 'wechat' },
      temporal: { startsAt: '2026-07-03T09:00:00+08:00' }
    }, ownerId)

    const restored = fromDbScheduleItem(row)
    expect(restored.reminders).toHaveLength(2)
    expect(restored.temporal.startsAt).toBe('2026-07-03T09:00:00+08:00')
  })

  it('can explicitly remove old reminder and temporal metadata', () => {
    const row = toDbScheduleItem({
      id: '11111111-1111-4111-8111-111111111111',
      title: '面试',
      date: '2026-07-03',
      time: '09:00',
      aiTrace: {
        reminder: { enabled: true, remindAt: '2026-07-03T00:00:00.000Z' },
        reminders: [{ enabled: true, remindAt: '2026-07-03T00:00:00.000Z' }],
        temporal: { startsAt: '2026-07-03T09:00:00+08:00' }
      },
      reminder: null,
      reminders: [],
      temporal: null
    }, ownerId)

    expect(row.ai_trace.reminder).toBeUndefined()
    expect(row.ai_trace.reminders).toBeUndefined()
    expect(row.ai_trace.temporal).toBeUndefined()
  })
})
