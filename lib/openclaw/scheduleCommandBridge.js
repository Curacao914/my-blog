import { compactCommandValue } from './commandProtocol'
import { primaryReminder } from './temporalSemantics'

const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

function clean(value) {
  return String(value || '').trim()
}

function localParts(value, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  }
}

function normalizeLegacyReminder(reminder = {}) {
  if (!reminder || typeof reminder !== 'object') return undefined
  return compactCommandValue({
    enabled: reminder.enabled !== false,
    mode: reminder.mode,
    remindAt: reminder.remindAt,
    leadMinutes: Number.isFinite(Number(reminder.leadMinutes)) ? Number(reminder.leadMinutes) : undefined,
    channel: reminder.channel || 'wechat',
    trigger: reminder.trigger,
    explicitlyRequested: reminder.explicitlyRequested === true ? true : undefined
  })
}

function temporalTrace(resolved = {}) {
  return compactCommandValue({
    timezone: resolved.timezone || DEFAULT_TIME_ZONE,
    startsAt: resolved.startsAt,
    dueAt: resolved.dueAt,
    endsAt: resolved.endsAt,
    allDay: resolved.allDay,
    durationMinutes: resolved.durationMinutes,
    resolution: resolved.resolution,
    raw: resolved.raw
  })
}

export function scheduleDisplayTimeFromResolved(resolved = {}) {
  const timeZone = resolved.timezone || DEFAULT_TIME_ZONE
  const primary = resolved.startsAt || resolved.dueAt
  const parts = localParts(primary, timeZone)
  if (parts) return parts
  if (resolved.date) return { date: clean(resolved.date), time: clean(resolved.time) }
  return null
}

export function applyResolvedScheduleCommand(
  parsed = {},
  resolvedCommand = {},
  currentItems = []
) {
  if (!resolvedCommand || typeof resolvedCommand !== 'object') return parsed

  const temporal = resolvedCommand.temporal || {}
  const reminders = Array.isArray(resolvedCommand.reminders) ? resolvedCommand.reminders : []
  const recurrence = resolvedCommand.recurrence
  const protocol = resolvedCommand.protocol
  const context = resolvedCommand.context || {}
  const referencedObjectId = protocol?.conversation?.referencedObjectId
  const referencedItem = referencedObjectId
    ? currentItems.find(item => item.id === referencedObjectId)
    : null
  const action = protocol?.command?.action || ''
  const shouldForceReference = Boolean(
    referencedItem &&
    context.followUp &&
    ['update', 'complete', 'cancel', 'delete', 'mark_read', 'snooze'].includes(action)
  )
  const incomingItems = Array.isArray(parsed.items) ? parsed.items : []
  const items = shouldForceReference
    ? [{
        ...referencedItem,
        ...(incomingItems[0] || {}),
        id: referencedItem.id,
        title: /改名|名称改为|标题改为|叫做/.test(context.originalCommand || '')
          ? (incomingItems[0]?.title || referencedItem.title)
          : referencedItem.title
      }]
    : incomingItems

  if (!items.length) return parsed

  const display = scheduleDisplayTimeFromResolved(temporal)

  const nextItems = items.map((item, index) => {
    if (index > 0) return item
    const existingTrace = item.aiTrace || item.ai_trace || {}
    const firstReminder = normalizeLegacyReminder(primaryReminder(reminders))
    const nextTrace = compactCommandValue({
      ...existingTrace,
      temporal: temporalTrace(temporal),
      reminders: reminders.map(normalizeLegacyReminder),
      recurrence,
      commandProtocol: protocol
    }) || existingTrace

    return {
      ...item,
      ...(display?.date ? { date: display.date } : {}),
      ...(display?.time ? { time: display.time } : {}),
      ...(firstReminder ? { reminder: firstReminder } : {}),
      ...(reminders.length ? { reminders: reminders.map(normalizeLegacyReminder) } : {}),
      ...(recurrence ? { recurrence } : {}),
      ...(Object.keys(temporalTrace(temporal) || {}).length ? { temporal: temporalTrace(temporal) } : {}),
      aiTrace: nextTrace
    }
  })

  return {
    ...parsed,
    mode: shouldForceReference ? 'replace' : parsed.mode,
    items: nextItems
  }
}

export function resolvedCommandForCapture({ protocol, temporal = {}, reminders, recurrence } = {}) {
  return compactCommandValue({
    protocol,
    temporal: {
      timezone: temporal.timezone || DEFAULT_TIME_ZONE,
      startsAt: temporal.startsAt,
      dueAt: temporal.dueAt,
      endsAt: temporal.endsAt,
      allDay: temporal.allDay,
      durationMinutes: temporal.durationMinutes,
      resolution: temporal.resolution,
      raw: temporal.raw,
      date: temporal.date,
      time: temporal.time
    },
    reminders: reminders || temporal.reminders,
    recurrence: recurrence || temporal.recurrence
  })
}

export function temporalFromScheduleItem(item = {}) {
  const trace = item.aiTrace || item.ai_trace || {}
  const stored = item.temporal || trace.temporal || {}
  const startsAt = stored.startsAt || trace.startsAt
  const dueAt = stored.dueAt || trace.dueAt
  return compactCommandValue({
    timezone: stored.timezone || DEFAULT_TIME_ZONE,
    startsAt,
    dueAt,
    endsAt: stored.endsAt,
    allDay: stored.allDay,
    durationMinutes: stored.durationMinutes,
    date: item.date || item.schedule_date,
    time: item.time || item.time_label,
    reminders: item.reminders || trace.reminders || (item.reminder ? [item.reminder] : undefined),
    recurrence: item.recurrence || trace.recurrence
  })
}
