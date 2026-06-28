import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { getReminderPreferences, upsertReminderPreferences } from '@/lib/server/supabase'

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

  const auth = await requireWorkspaceRequest(req, { permission: 'reminders' })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  try {
    if (req.method === 'GET') {
      const row = await getReminderPreferences(auth.profile.id)
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({
        ok: true,
        preference: publicPreference(row, auth.profile.email || '')
      })
    }

    const email = String(req.body?.email || '').trim()
    if (!validEmail(email)) return res.status(400).json({ ok: false, error: '请输入有效的接收邮箱' })
    const row = await upsertReminderPreferences(auth.profile.id, {
      email,
      daily_digest_enabled: Boolean(req.body?.dailyDigestEnabled),
      weekly_digest_enabled: Boolean(req.body?.weeklyDigestEnabled),
      due_reminders_enabled: req.body?.dueRemindersEnabled !== false,
      timezone: 'Asia/Shanghai',
      daily_time: '09:00',
      weekly_day: 1
    })
    return res.status(200).json({ ok: true, preference: publicPreference(row) })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Reminder settings failed'
    })
  }
}
