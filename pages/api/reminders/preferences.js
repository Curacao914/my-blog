import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { ensureProfile, getReminderPreferences, upsertReminderPreferences } from '@/lib/server/supabase'

function ownerUserId(auth) {
  return (
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.WECHAT_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    auth.userId ||
    (auth.via === 'local-dev' ? 'local-dev' : '')
  )
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function publicPreference(row, fallbackEmail = '') {
  return {
    email: row?.email || fallbackEmail || '',
    dailyDigestEnabled: row ? Boolean(row.daily_digest_enabled) : true,
    weeklyDigestEnabled: Boolean(row?.weekly_digest_enabled),
    dueRemindersEnabled: row?.due_reminders_enabled !== false,
    timezone: row?.timezone || 'Asia/Shanghai',
    dailyTime: row?.daily_time || '09:00',
    weeklyDay: Number.isFinite(Number(row?.weekly_day)) ? Number(row.weekly_day) : 1,
    lastDailySentOn: row?.last_daily_sent_on || null,
    lastWeeklySentOn: row?.last_weekly_sent_on || null,
    configured: Boolean(row)
  }
}

export default async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  const clerkUserId = ownerUserId(auth)
  if (!clerkUserId) return res.status(500).json({ ok: false, error: 'No schedule owner configured' })

  try {
    const { profile } = await ensureProfile({ clerkUserId })
    if (req.method === 'GET') {
      const row = await getReminderPreferences(profile.id)
      const fallbackEmail = auth.user?.email || process.env.REMINDER_TO || ''
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({ ok: true, preference: publicPreference(row, fallbackEmail) })
    }

    if (req.method === 'PATCH') {
      const email = String(req.body?.email || '').trim()
      if (!validEmail(email)) return res.status(400).json({ ok: false, error: '请输入有效的接收邮箱' })
      const row = await upsertReminderPreferences(profile.id, {
        email,
        daily_digest_enabled: Boolean(req.body?.dailyDigestEnabled),
        weekly_digest_enabled: Boolean(req.body?.weeklyDigestEnabled),
        due_reminders_enabled: req.body?.dueRemindersEnabled !== false,
        timezone: 'Asia/Shanghai',
        daily_time: '09:00',
        weekly_day: 1
      })
      return res.status(200).json({ ok: true, preference: publicPreference(row) })
    }

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Reminder settings failed'
    })
  }
}
