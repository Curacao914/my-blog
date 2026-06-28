const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

export function dateKeyInTimeZone(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function addDaysToDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function concreteDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : ''
}

function effectiveDate(item, todayKey) {
  const value = String(item?.date || item?.schedule_date || '')
  if (value === 'today') return todayKey
  return concreteDate(value)
}

function active(item) {
  return item?.status !== 'done' && item?.status !== 'cancelled' && item?.status !== 'archived'
}

function compareItem(left, right) {
  const leftPinned = Boolean(left?.isPinned || left?.is_pinned)
  const rightPinned = Boolean(right?.isPinned || right?.is_pinned)
  if (leftPinned !== rightPinned) return leftPinned ? -1 : 1
  const leftHigh = left?.priority === 'high'
  const rightHigh = right?.priority === 'high'
  if (leftHigh !== rightHigh) return leftHigh ? -1 : 1
  return String(left?.time || left?.time_label || '99:99').localeCompare(String(right?.time || right?.time_label || '99:99'))
}

export function buildDailyDigestSections(items = [], now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const todayKey = dateKeyInTimeZone(now, timeZone)
  const tomorrowKey = addDaysToDateKey(todayKey, 1)
  const weekEndKey = addDaysToDateKey(todayKey, 7)
  const activeItems = items.filter(active)
  const actions = activeItems.filter(item => item?.contentType !== 'reading' && item?.content_type !== 'reading')
  const readings = activeItems.filter(item => item?.contentType === 'reading' || item?.content_type === 'reading')

  const overdue = actions.filter(item => {
    const key = effectiveDate(item, todayKey)
    return key && key < todayKey
  }).sort(compareItem)
  const today = actions.filter(item => effectiveDate(item, todayKey) === todayKey).sort(compareItem)
  const tomorrow = actions.filter(item => effectiveDate(item, todayKey) === tomorrowKey).sort(compareItem)
  const upcoming = actions.filter(item => {
    const key = effectiveDate(item, todayKey)
    return key > tomorrowKey && key <= weekEndKey
  }).sort((a, b) => effectiveDate(a, todayKey).localeCompare(effectiveDate(b, todayKey)) || compareItem(a, b))
  const reading = readings.filter(item => {
    const key = effectiveDate(item, todayKey)
    return !key || key <= weekEndKey
  }).sort(compareItem)

  return { todayKey, tomorrowKey, overdue, today, tomorrow, upcoming, reading }
}

export function buildWeeklyReview(items = [], now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const todayKey = dateKeyInTimeZone(now, timeZone)
  const weekStart = addDaysToDateKey(todayKey, -6)
  const weekEnd = addDaysToDateKey(todayKey, 7)
  const completed = items.filter(item => {
    if (item?.status !== 'done') return false
    const updated = String(item?.updatedAt || item?.updated_at || '').slice(0, 10)
    return updated && updated >= weekStart && updated <= todayKey
  }).sort(compareItem)
  const nextSevenDays = items.filter(item => {
    if (!active(item)) return false
    const key = effectiveDate(item, todayKey)
    return key >= todayKey && key <= weekEnd
  }).sort((a, b) => effectiveDate(a, todayKey).localeCompare(effectiveDate(b, todayKey)) || compareItem(a, b))
  return { completed, nextSevenDays }
}

export function isMondayInTimeZone(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now)
  return weekday === 'Mon'
}

export function digestHasContent(sections, reminderRows = [], weeklyReview = null) {
  return Boolean(
    sections.overdue.length ||
    sections.today.length ||
    sections.tomorrow.length ||
    sections.upcoming.length ||
    sections.reading.length ||
    reminderRows.length ||
    weeklyReview?.completed?.length
  )
}

export const REMINDER_TIME_ZONE = DEFAULT_TIME_ZONE
