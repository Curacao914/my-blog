import handler from '@/pages/api/reminders/preferences'

import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { ensureProfile, getReminderPreferences, upsertReminderPreferences } from '@/lib/server/supabase'

jest.mock('@/lib/auth/serverAdmin', () => ({ requireAdminRequest: jest.fn() }))
jest.mock('@/lib/server/supabase', () => ({
  ensureProfile: jest.fn(),
  getReminderPreferences: jest.fn(),
  upsertReminderPreferences: jest.fn()
}))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/reminders/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireAdminRequest.mockResolvedValue({ ok: true, via: 'clerk', userId: 'user-1', user: { email: 'owner@example.com' } })
    ensureProfile.mockResolvedValue({ profile: { id: 'profile-1' } })
  })

  it('defaults the first setup to a daily digest without creating a row on read', async () => {
    getReminderPreferences.mockResolvedValue(null)
    const res = createRes()
    await handler({ method: 'GET', body: {} }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.preference).toEqual(expect.objectContaining({
      email: 'owner@example.com',
      dailyDigestEnabled: true,
      dueRemindersEnabled: true,
      timezone: 'Asia/Shanghai',
      dailyTime: '09:00'
    }))
    expect(upsertReminderPreferences).not.toHaveBeenCalled()
  })

  it('validates email and stores only the supported first-version schedule', async () => {
    upsertReminderPreferences.mockResolvedValue({
      owner_id: 'profile-1',
      email: 'mail@example.com',
      daily_digest_enabled: true,
      weekly_digest_enabled: true,
      due_reminders_enabled: true,
      timezone: 'Asia/Shanghai',
      daily_time: '09:00',
      weekly_day: 1
    })
    const res = createRes()
    await handler({
      method: 'PATCH',
      body: {
        email: 'mail@example.com',
        dailyDigestEnabled: true,
        weeklyDigestEnabled: true,
        dueRemindersEnabled: true,
        timezone: 'Etc/Unknown',
        dailyTime: '02:00'
      }
    }, res)

    expect(res.statusCode).toBe(200)
    expect(upsertReminderPreferences).toHaveBeenCalledWith('profile-1', expect.objectContaining({
      email: 'mail@example.com',
      timezone: 'Asia/Shanghai',
      daily_time: '09:00',
      weekly_day: 1
    }))
  })
})
