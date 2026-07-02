import crypto from 'crypto'

import {
  cancelMessageDeliveries,
  enqueueMessageDelivery,
  listMessageDeliveriesForObject,
  reviveMessageDelivery
} from '@/lib/server/messageDeliveries'

export const SCHEDULE_REMINDER_PURPOSE = 'schedule-reminder'
export const SCHEDULE_REMINDER_GRACE_MS = 10 * 60 * 1000

function clean(value) {
  return String(value || '').trim()
}

function activeReminders(item = {}) {
  const raw = Array.isArray(item.reminders) && item.reminders.length
    ? item.reminders
    : item.reminder
      ? [item.reminder]
      : []
  return raw
    .filter(reminder =>
      reminder &&
      reminder.enabled !== false &&
      (reminder.channel || 'wechat') === 'wechat'
    )
    .map(reminder => ({
      ...reminder,
      channel: 'wechat'
    }))
}

function itemStartsAt(item = {}) {
  const value =
    item.temporal?.startsAt ||
    item.temporal?.dueAt ||
    item.aiTrace?.temporal?.startsAt ||
    item.aiTrace?.temporal?.dueAt
  if (value) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }

  const date = clean(item.date || item.schedule_date)
  const time = clean(item.time || item.time_label)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null
  }
  const instant = new Date(`${date}T${time}:00+08:00`)
  return Number.isNaN(instant.getTime()) ? null : instant
}

function reminderInstant(reminder = {}, item = {}) {
  if (reminder.remindAt) {
    const explicit = new Date(reminder.remindAt)
    if (!Number.isNaN(explicit.getTime())) return explicit
  }

  const startsAt = itemStartsAt(item)
  if (!startsAt) return null
  const lead = Number(reminder.leadMinutes || 0)
  return new Date(startsAt.getTime() - Math.max(0, lead) * 60_000)
}

function formatShanghai(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value])
  )
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`
}

function reminderLabel(reminder = {}) {
  const lead = Number(reminder.leadMinutes)
  if (reminder.mode === 'before' && Number.isFinite(lead) && lead > 0) {
    if (lead % 1440 === 0) return `提前${lead / 1440}天`
    if (lead % 60 === 0) return `提前${lead / 60}小时`
    return `提前${lead}分钟`
  }
  if (reminder.mode === 'absolute') return '指定时刻'
  return '到时'
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 24)
}

export function buildScheduleReminderDeliverySpecs({
  ownerId,
  item,
  siteUrl = 'https://law-tech.dev',
  now = new Date()
} = {}) {
  if (!ownerId || !item?.id) return []
  if (['done', 'cancelled', 'archived'].includes(item.status)) return []

  const startsAt = itemStartsAt(item)
  const nowMs = now.getTime()
  const baseUrl = String(siteUrl || 'https://law-tech.dev').replace(/\/$/, '')
  const seen = new Set()

  return activeReminders(item).flatMap((reminder, index) => {
    const remindAt = reminderInstant(reminder, item)
    if (!remindAt) return []
    if (remindAt.getTime() < nowMs - SCHEDULE_REMINDER_GRACE_MS) return []

    const eventLabel = startsAt ? formatShanghai(startsAt) : ''
    const reminderTimeLabel = formatShanghai(remindAt)
    const leadLabel = reminderLabel(reminder)
    const title = clean(item.title) || '未命名事项'
    const bodyText = [
      `提醒：${title}`,
      eventLabel ? `事项时间：${eventLabel}` : '',
      clean(item.place) ? `地点：${clean(item.place)}` : '',
      `提醒时间：${reminderTimeLabel}${leadLabel ? `（${leadLabel}）` : ''}`,
      clean(item.summary) || clean(item.note) || '',
      `[打开今日工作台](${baseUrl}/desk/today)`
    ].filter(Boolean).join('\n')

    const identity = [
      item.id,
      remindAt.toISOString(),
      reminder.mode || 'at',
      Number(reminder.leadMinutes || 0)
    ].join('|')
    if (seen.has(identity)) return []
    seen.add(identity)

    return [{
      ownerId,
      purpose: SCHEDULE_REMINDER_PURPOSE,
      dedupeKey: `${SCHEDULE_REMINDER_PURPOSE}:${item.id}:${fingerprint(identity)}`,
      subject: `提醒：${title}`,
      bodyText,
      objectType: 'schedule-item',
      objectId: item.id,
      objectUrl: '/desk/today',
      scheduledFor: remindAt.toISOString(),
      metadata: {
        scheduleItemId: item.id,
        reminderIndex: index,
        reminderMode: reminder.mode || 'at',
        leadMinutes: Number.isFinite(Number(reminder.leadMinutes))
          ? Number(reminder.leadMinutes)
          : null,
        remindAt: remindAt.toISOString(),
        startsAt: startsAt?.toISOString() || null,
        expiresAt: new Date(remindAt.getTime() + SCHEDULE_REMINDER_GRACE_MS).toISOString()
      }
    }]
  })
}

export async function syncScheduleReminderDeliveries({
  ownerId,
  item,
  now = new Date(),
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://law-tech.dev'
} = {}) {
  if (!ownerId || !item?.id) return { ok: true, created: 0, kept: 0, cancelled: 0 }

  const desired = buildScheduleReminderDeliverySpecs({
    ownerId,
    item,
    now,
    siteUrl
  })
  const existing = await listMessageDeliveriesForObject({
    ownerId,
    purpose: SCHEDULE_REMINDER_PURPOSE,
    objectType: 'schedule-item',
    objectId: item.id,
    limit: 100
  })

  const desiredKeys = new Set(desired.map(spec => spec.dedupeKey))
  const staleIds = (existing || [])
    .filter(row =>
      ['pending', 'claimed'].includes(row.status) &&
      !desiredKeys.has(row.dedupe_key)
    )
    .map(row => row.id)

  if (staleIds.length) {
    await cancelMessageDeliveries(
      staleIds,
      'schedule reminder replaced or schedule item closed'
    )
  }

  let created = 0
  let kept = 0
  for (const spec of desired) {
    const row = (existing || []).find(itemRow => itemRow.dedupe_key === spec.dedupeKey)
    if (!row) {
      const queued = await enqueueMessageDelivery(spec)
      if (queued.created) created += 1
      else kept += 1
      continue
    }

    if (['cancelled', 'failed'].includes(row.status)) {
      await reviveMessageDelivery(row.id, spec)
      created += 1
      continue
    }

    kept += 1
  }

  return {
    ok: true,
    created,
    kept,
    cancelled: staleIds.length,
    desired: desired.length
  }
}

export async function cancelScheduleReminderDeliveries({
  ownerId,
  itemIds = []
} = {}) {
  let cancelled = 0
  for (const itemId of itemIds || []) {
    const rows = await listMessageDeliveriesForObject({
      ownerId,
      purpose: SCHEDULE_REMINDER_PURPOSE,
      objectType: 'schedule-item',
      objectId: itemId,
      limit: 100
    })
    const ids = (rows || [])
      .filter(row => ['pending', 'claimed'].includes(row.status))
      .map(row => row.id)
    if (ids.length) {
      await cancelMessageDeliveries(ids, 'schedule item deleted')
      cancelled += ids.length
    }
  }
  return cancelled
}
