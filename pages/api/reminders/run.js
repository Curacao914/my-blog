import {
  listPendingReminders,
  updateReminder
} from '@/lib/server/supabase'
import {
  formatReminderEmail,
  markReminderEvent
} from '@/lib/server/reminders'

function readToken(req) {
  const authHeader = req.headers.authorization || ''
  if (/^Bearer\s+/i.test(authHeader)) return authHeader.replace(/^Bearer\s+/i, '')
  return req.query?.token || ''
}

function isAuthorized(req) {
  const token = readToken(req)
  const accepted = [process.env.REMINDER_RUN_TOKEN, process.env.CRON_SECRET, process.env.TASK_REMINDER_TOKEN].filter(Boolean)
  return accepted.length > 0 && accepted.includes(token)
}

function getReminderWindowEnd(req, now) {
  const explicitHours = req.query?.lookaheadHours
  const isVercelCron = Boolean(req.headers['x-vercel-cron-schedule'])
  const hours = explicitHours !== undefined ? Number(explicitHours) : (isVercelCron ? 24 : 0)
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.min(hours, 48)) : 0
  return new Date(now.getTime() + safeHours * 60 * 60 * 1000).toISOString()
}

async function sendEmail(reminder) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.REMINDER_FROM || 'Law-Tech <onboarding@resend.dev>'
  const to = process.env.REMINDER_TO
  if (!apiKey || !to) throw new Error('Reminder email is not configured')

  const email = formatReminderEmail(reminder)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: email.subject,
      text: email.text,
      html: email.html
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || `Resend failed with ${response.status}`)
  }
  return data
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })

  try {
    const nowDate = new Date()
    const now = nowDate.toISOString()
    const windowEnd = getReminderWindowEnd(req, nowDate)
    const reminders = await listPendingReminders({
      windowEnd,
      limit: req.query?.limit || 20
    })

    const results = []
    for (const reminder of reminders || []) {
      try {
        const emailResult = await sendEmail(reminder)
        await updateReminder(
          reminder.id,
          {
            status: 'sent',
            attempts: (reminder.attempts || 0) + 1,
            last_error: null,
            updated_at: new Date().toISOString()
          },
          '&status=eq.pending'
        )
        await markReminderEvent({
          reminder,
          eventType: 'sent',
          message: 'email sent',
          metadata: { resendId: emailResult?.id || null }
        })
        results.push({ id: reminder.id, status: 'sent' })
      } catch (error) {
        const attempts = (reminder.attempts || 0) + 1
        await updateReminder(reminder.id, {
          status: attempts >= 3 ? 'failed' : 'pending',
          attempts,
          last_error: error.message,
          updated_at: new Date().toISOString()
        })
        await markReminderEvent({
          reminder,
          eventType: 'failed',
          message: error.message,
          metadata: { attempts }
        })
        results.push({
          id: reminder.id,
          status: attempts >= 3 ? 'failed' : 'pending',
          error: error.message
        })
      }
    }

    return res.status(200).json({
      ok: true,
      checkedAt: now,
      windowEnd,
      count: results.length,
      results
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'REMINDER_RUN_FAILED'
    })
  }
}
