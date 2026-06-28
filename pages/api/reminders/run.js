import crypto from 'crypto'

import { fromDbScheduleItem } from '@/lib/domain/schedule'
import { dateKeyInTimeZone, isMondayInTimeZone, REMINDER_TIME_ZONE } from '@/lib/domain/reminderDigest'
import { sendReminderEmail } from '@/lib/server/email'
import { buildDigestEmail } from '@/lib/server/reminderDigest'
import { markReminderEvent } from '@/lib/server/reminders'
import {
  listConfiguredReminderPreferences,
  listPendingReminders,
  listScheduleRows,
  updateReminder,
  upsertReminderPreferences
} from '@/lib/server/supabase'

function readToken(req) {
  const authHeader = req.headers.authorization || ''
  if (/^Bearer\s+/i.test(authHeader)) return authHeader.replace(/^Bearer\s+/i, '')
  return req.headers['x-law-tech-reminder-token'] || req.headers['x-reminder-token'] || ''
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  if (!leftBuffer.length || leftBuffer.length !== rightBuffer.length) return false
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function isAuthorized(req) {
  const token = readToken(req)
  const accepted = [process.env.REMINDER_RUN_TOKEN, process.env.CRON_SECRET, process.env.TASK_REMINDER_TOKEN].filter(Boolean)
  return accepted.some(expected => safeEqual(token, expected))
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString()
}

function groupByOwner(rows = []) {
  return rows.reduce((groups, row) => {
    const ownerId = row?.owner_id
    if (!ownerId) return groups
    if (!groups.has(ownerId)) groups.set(ownerId, [])
    groups.get(ownerId).push(row)
    return groups
  }, new Map())
}

function fallbackPreference(ownerId) {
  const email = String(process.env.REMINDER_TO || '').trim()
  if (!email) return null
  return {
    owner_id: ownerId,
    email,
    daily_digest_enabled: false,
    weekly_digest_enabled: false,
    due_reminders_enabled: true,
    timezone: REMINDER_TIME_ZONE,
    last_daily_sent_on: null,
    last_weekly_sent_on: null,
    source: 'environment'
  }
}

async function markRowsSent(rows, emailResult) {
  for (const reminder of rows || []) {
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
      message: 'included in daily email',
      metadata: { resendId: emailResult?.id || null }
    })
  }
}

async function markRowsFailed(rows, error) {
  const message = error instanceof Error ? error.message : 'Reminder delivery failed'
  for (const reminder of rows || []) {
    const attempts = (reminder.attempts || 0) + 1
    await updateReminder(reminder.id, {
      status: attempts >= 3 ? 'failed' : 'pending',
      attempts,
      last_error: message,
      updated_at: new Date().toISOString()
    })
    await markReminderEvent({
      reminder,
      eventType: 'failed',
      message,
      metadata: { attempts }
    })
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })

  const now = req.query?.now ? new Date(String(req.query.now)) : new Date()
  if (Number.isNaN(now.getTime())) return res.status(400).json({ ok: false, error: 'Invalid now value' })

  try {
    const todayKey = dateKeyInTimeZone(now, REMINDER_TIME_ZONE)
    const [preferences, pending] = await Promise.all([
      listConfiguredReminderPreferences(),
      listPendingReminders({ windowEnd: addHours(now, 24), limit: req.query?.limit || 50 })
    ])
    const remindersByOwner = groupByOwner(pending || [])
    const preferenceByOwner = new Map((preferences || []).map(preference => [preference.owner_id, preference]))
    for (const ownerId of remindersByOwner.keys()) {
      if (!preferenceByOwner.has(ownerId)) {
        const fallback = fallbackPreference(ownerId)
        if (fallback) preferenceByOwner.set(ownerId, fallback)
      }
    }

    const results = []
    for (const preference of preferenceByOwner.values()) {
      const ownerId = preference.owner_id
      const ownerReminders = preference.due_reminders_enabled === false
        ? []
        : (remindersByOwner.get(ownerId) || [])
      const dailyNeeded = Boolean(preference.daily_digest_enabled && preference.last_daily_sent_on !== todayKey)
      const weeklyNeeded = Boolean(
        preference.weekly_digest_enabled &&
        isMondayInTimeZone(now, REMINDER_TIME_ZONE) &&
        preference.last_weekly_sent_on !== todayKey
      )
      if (!dailyNeeded && !weeklyNeeded && !ownerReminders.length) continue

      try {
        const rows = await listScheduleRows(ownerId)
        const items = (rows || []).map(fromDbScheduleItem)
        const email = buildDigestEmail({
          items,
          reminders: ownerReminders,
          now,
          weeklyEnabled: weeklyNeeded,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_LINK || 'https://law-tech.dev'
        })
        const emailResult = await sendReminderEmail({
          to: preference.email,
          subject: email.subject,
          text: email.text,
          html: email.html
        })
        await markRowsSent(ownerReminders, emailResult)

        if (preference.source !== 'environment') {
          await upsertReminderPreferences(ownerId, {
            ...(dailyNeeded ? { last_daily_sent_on: todayKey } : {}),
            ...(weeklyNeeded ? { last_weekly_sent_on: todayKey } : {})
          })
        }
        results.push({
          ownerId,
          status: 'sent',
          reminderCount: ownerReminders.length,
          daily: dailyNeeded,
          weekly: weeklyNeeded
        })
      } catch (error) {
        await markRowsFailed(ownerReminders, error)
        results.push({
          ownerId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Reminder delivery failed'
        })
      }
    }

    const ok = results.every(result => result.status === 'sent')
    return res.status(ok ? 200 : 500).json({
      ok,
      checkedAt: now.toISOString(),
      localDate: todayKey,
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
