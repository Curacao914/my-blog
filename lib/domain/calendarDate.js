const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isCalendarDate(value = '') {
  return ISO_DATE_PATTERN.test(String(value || ''))
}

export function calendarDateInTimeZone(date = new Date(), timeZone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function addCalendarDays(isoDate, days) {
  const match = String(isoDate || '').match(ISO_DATE_PATTERN)
  if (!match) throw new Error('Invalid calendar date')
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + Number(days || 0)))
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-')
}

export function calendarDateLabel(isoDate, referenceDate) {
  if (!isCalendarDate(isoDate) || !isCalendarDate(referenceDate)) return isoDate
  if (isoDate < referenceDate) return '留到今天'
  if (isoDate === referenceDate) return '今天'
  if (isoDate === addCalendarDays(referenceDate, 1)) return '明天'
  if (isoDate === addCalendarDays(referenceDate, 2)) return '后天'
  return isoDate
}
