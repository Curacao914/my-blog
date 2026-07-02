const TIME_ZONE_OFFSET = '+08:00'

function isConcreteDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))
}

function isConcreteTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))
}

function toDateTime(date, time) {
  if (!isConcreteDate(date) || !isConcreteTime(time)) return null
  const value = new Date(`${date}T${time}:00${TIME_ZONE_OFFSET}`)
  return Number.isNaN(value.getTime()) ? null : value
}

function minutesBeforeForItem(item) {
  if (!item?.reminder || item.reminder.enabled === false) return null
  if (Number.isFinite(Number(item.reminder.leadMinutes))) {
    return Math.max(0, Number(item.reminder.leadMinutes))
  }
  return 0
}

function parseExplicitReminderAt(reminder) {
  const value = String(reminder?.remindAt || '').trim()
  if (!value || value === 'none') return null
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}:00${TIME_ZONE_OFFSET}`
  const date = new Date(withZone)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getItemStartsAt(item) {
  return toDateTime(item?.date || item?.schedule_date, item?.time || item?.time_label)
}

export function buildReminderForItem(item, ownerId) {
  if (!item || item.status === 'done' || item.status === 'cancelled') return null
  if (!item.reminder || item.reminder.enabled === false) return null

  const startsAt = getItemStartsAt(item)
  const explicitReminderAt = parseExplicitReminderAt(item.reminder)
  const leadMinutes = minutesBeforeForItem(item)
  if (!startsAt && !explicitReminderAt) return null
  if (leadMinutes === null && !explicitReminderAt) return null

  const remindAt = explicitReminderAt || new Date(startsAt.getTime() - leadMinutes * 60 * 1000)
  if (Number.isNaN(remindAt.getTime())) return null

  return {
    owner_id: ownerId,
    schedule_item_id: item.id,
    channel: item.reminder?.channel || 'email',
    remind_at: remindAt.toISOString(),
    status: 'pending',
    payload: {
      title: item.title || '未命名事项',
      section: item.section || '其他',
      sectionKey: item.sectionKey || item.section_key || '',
      date: item.date || item.schedule_date || '',
      time: item.time || item.time_label || '',
      place: item.place || '',
      priority: item.priority || 'normal',
      contentType: item.contentType || 'action',
      importance: item.importance || 'normal',
      urgency: item.urgency || 'not_urgent',
      isPinned: Boolean(item.isPinned),
      links: item.links || [],
      summary: item.summary || '',
      note: item.note || '',
      startsAt: startsAt?.toISOString() || null,
      leadMinutes: explicitReminderAt ? item.reminder?.leadMinutes ?? null : leadMinutes,
      reminderMode: item.reminder?.mode || (leadMinutes > 0 ? 'before' : 'at'),
      temporal: item.temporal || null,
      recurrence: item.recurrence || null
    }
  }
}

export function shouldCancelRemindersForItem(item) {
  return item?.status === 'done' || item?.status === 'cancelled' || item?.reminder?.enabled === false
}
