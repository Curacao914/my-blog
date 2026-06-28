import handler from '@/pages/api/reminders/run'

import { sendReminderEmail } from '@/lib/server/email'
import { buildDigestEmail } from '@/lib/server/reminderDigest'
import { getWorkspaceProfileById } from '@/lib/server/workspaceProfiles'
import { resolveUserEmailConfig } from '@/lib/server/userIntegrations'
import {
  listConfiguredReminderPreferences,
  listPendingReminders,
  listScheduleRows,
  updateReminder,
  upsertReminderPreferences
} from '@/lib/server/supabase'

jest.mock('@/lib/server/email', () => ({ sendReminderEmail: jest.fn() }))
jest.mock('@/lib/server/reminderDigest', () => ({
  buildDigestEmail: jest.fn(() => ({ subject: '今日安排', text: 'text', html: '<p>html</p>' }))
}))
jest.mock('@/lib/server/reminders', () => ({ markReminderEvent: jest.fn(async () => {}) }))
jest.mock('@/lib/server/workspaceProfiles', () => ({ getWorkspaceProfileById: jest.fn() }))
jest.mock('@/lib/server/userIntegrations', () => ({ resolveUserEmailConfig: jest.fn() }))
jest.mock('@/lib/server/supabase', () => ({
  listConfiguredReminderPreferences: jest.fn(),
  listPendingReminders: jest.fn(),
  listScheduleRows: jest.fn(),
  updateReminder: jest.fn(),
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

describe('/api/reminders/run', () => {
  const previousSecret = process.env.CRON_SECRET
  const previousFallbackEmail = process.env.REMINDER_TO

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'cron-secret-for-tests'
    process.env.REMINDER_TO = 'legacy@example.com'
    listConfiguredReminderPreferences.mockResolvedValue([])
    listPendingReminders.mockResolvedValue([])
    listScheduleRows.mockResolvedValue([])
    getWorkspaceProfileById.mockResolvedValue({ id: 'profile-1', role: 'member', status: 'active' })
    resolveUserEmailConfig.mockResolvedValue({ apiKey: 'user-resend-key', from: 'Law-Tech <mail@example.com>', source: 'user' })
    sendReminderEmail.mockResolvedValue({ id: 'email-1' })
    updateReminder.mockResolvedValue([])
    upsertReminderPreferences.mockResolvedValue({})
  })

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previousSecret
    if (previousFallbackEmail === undefined) delete process.env.REMINDER_TO
    else process.env.REMINDER_TO = previousFallbackEmail
  })

  it('fails closed without a configured bearer token', async () => {
    const res = createRes()
    await handler({ method: 'GET', headers: {}, query: {} }, res)
    expect(res.statusCode).toBe(401)
    expect(sendReminderEmail).not.toHaveBeenCalled()
  })

  it('respects an explicitly disabled preference instead of reviving the legacy fallback', async () => {
    listConfiguredReminderPreferences.mockResolvedValue([{
      owner_id: 'profile-1',
      email: 'owner@example.com',
      daily_digest_enabled: false,
      weekly_digest_enabled: false,
      due_reminders_enabled: false,
      last_daily_sent_on: null,
      last_weekly_sent_on: null
    }])
    listPendingReminders.mockResolvedValue([{
      id: 'reminder-1',
      owner_id: 'profile-1',
      schedule_item_id: 'item-1',
      status: 'pending',
      attempts: 0,
      payload: { title: '不应发送' }
    }])

    const res = createRes()
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret-for-tests' },
      query: { now: '2026-06-29T01:00:00.000Z' }
    }, res)

    expect(res.statusCode).toBe(200)
    expect(sendReminderEmail).not.toHaveBeenCalled()
    expect(res.body.count).toBe(0)
  })

  it('does not send a member reminder to the owner legacy fallback email', async () => {
    listPendingReminders.mockResolvedValue([{
      id: 'reminder-member',
      owner_id: 'profile-1',
      schedule_item_id: 'item-member',
      status: 'pending',
      attempts: 0,
      payload: { title: '成员事项' }
    }])
    getWorkspaceProfileById.mockResolvedValue({ id: 'profile-1', role: 'member', status: 'active' })

    const res = createRes()
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret-for-tests' },
      query: { now: '2026-06-29T01:00:00.000Z' }
    }, res)

    expect(res.statusCode).toBe(200)
    expect(sendReminderEmail).not.toHaveBeenCalled()
    expect(res.body.count).toBe(0)
  })

  it('sends one daily digest and advances the owner send date', async () => {
    listConfiguredReminderPreferences.mockResolvedValue([{
      owner_id: 'profile-1',
      email: 'owner@example.com',
      daily_digest_enabled: true,
      weekly_digest_enabled: false,
      due_reminders_enabled: true,
      timezone: 'Asia/Shanghai',
      last_daily_sent_on: null,
      last_weekly_sent_on: null
    }])
    listScheduleRows.mockResolvedValue([{
      id: 'item-1',
      title: '今天的任务',
      schedule_date: 'today',
      status: 'active',
      ai_trace: {}
    }])

    const res = createRes()
    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret-for-tests' },
      query: { now: '2026-06-29T01:00:00.000Z' }
    }, res)

    expect(res.statusCode).toBe(200)
    expect(buildDigestEmail).toHaveBeenCalledWith(expect.objectContaining({ weeklyEnabled: false }))
    expect(sendReminderEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com', config: expect.objectContaining({ apiKey: 'user-resend-key' }) }))
    expect(upsertReminderPreferences).toHaveBeenCalledWith('profile-1', { last_daily_sent_on: '2026-06-29' })
    expect(res.body.results).toEqual([expect.objectContaining({ status: 'sent', daily: true })])
  })
})
