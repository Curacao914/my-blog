import { executeTool } from '@/lib/openclaw/agent/tools'
import {
  listScheduleRows,
  upsertScheduleRows
} from '@/lib/server/supabase'
import { syncRemindersForScheduleItems } from '@/lib/server/reminders'

jest.mock('@/lib/server/supabase', () => ({
  listScheduleRows: jest.fn(),
  upsertScheduleRows: jest.fn(),
  deleteScheduleRows: jest.fn()
}))
jest.mock('@/lib/server/reminders', () => ({
  syncRemindersForScheduleItems: jest.fn()
}))
jest.mock('@/lib/server/scheduleReminderDeliveries', () => ({
  cancelScheduleReminderDeliveries: jest.fn()
}))
jest.mock('@/lib/server/courseBriefReads', () => ({
  setCourseBriefRead: jest.fn()
}))

describe('OpenClaw Agent tools', () => {
  test('marks every explicitly matching Reading item as read', async () => {
    listScheduleRows.mockResolvedValue([])
    upsertScheduleRows.mockImplementation(async rows => rows.map(row => ({
      ...row,
      created_at: '2026-07-03T00:00:00.000Z',
      updated_at: '2026-07-03T00:00:00.000Z'
    })))
    syncRemindersForScheduleItems.mockResolvedValue({ ok: true, warnings: [] })

    const targets = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        type: 'reading',
        title: 'A',
        status: 'active',
        version: 'v1',
        item: {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'A',
          contentType: 'reading',
          section: '阅读',
          sectionKey: 'reading',
          date: 'reading',
          status: 'active',
          links: [],
          children: [],
          aiTrace: {}
        }
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'reading',
        title: 'B',
        status: 'active',
        version: 'v2',
        item: {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'B',
          contentType: 'reading',
          section: '阅读',
          sectionKey: 'reading',
          date: 'reading',
          status: 'active',
          links: [],
          children: [],
          aiTrace: {}
        }
      }
    ]

    const result = await executeTool({
      ownerId: 'owner',
      plan: {
        capability: 'reading.mark_read',
        scope: 'matching',
        parameters: {}
      },
      card: {
        id: 'reading.mark_read',
        domain: 'reading',
        requiresTarget: true
      },
      targets,
      context: {
        senderId: 'sender',
        messageId: 'message',
        traceId: 'trace'
      }
    })

    expect(upsertScheduleRows).toHaveBeenCalledTimes(1)
    expect(upsertScheduleRows.mock.calls[0][0]).toHaveLength(2)
    expect(result.count).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(result.items.every(item => item.status === 'done')).toBe(true)
  })
})
