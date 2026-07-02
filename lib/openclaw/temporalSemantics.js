const DEFAULT_TIME_ZONE = 'Asia/Shanghai'
const DEFAULT_NIGHT_ROLLOVER_HOUR = 4

const CHINESE_DIGITS = {
  零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 兩: 2, 三: 3, 四: 4,
  五: 5, 六: 6, 七: 7, 八: 8, 九: 9
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

export function parseChineseNumber(value) {
  const text = clean(value)
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text)
  if (text === '半') return 0.5
  if (text === '十') return 10
  if (/^十[一二两兩三四五六七八九]$/.test(text)) return 10 + CHINESE_DIGITS[text[1]]
  if (/^[一二两兩三四五六七八九]十$/.test(text)) return CHINESE_DIGITS[text[0]] * 10
  if (/^[一二两兩三四五六七八九]十[一二两兩三四五六七八九]$/.test(text)) {
    return CHINESE_DIGITS[text[0]] * 10 + CHINESE_DIGITS[text[2]]
  }
  if (text.length === 1 && Object.prototype.hasOwnProperty.call(CHINESE_DIGITS, text)) return CHINESE_DIGITS[text]
  return Number.NaN
}

function zonedParts(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  }
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function dateKey(parts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function weekdayIndex(value) {
  return { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }[value]
}

function localWeekday(dateValue) {
  return new Date(`${dateValue}T00:00:00Z`).getUTCDay()
}

function nextWeekday(dateValue, target, forceNextWeek = false) {
  const current = localWeekday(dateValue)
  let delta = (target - current + 7) % 7
  if (forceNextWeek || delta === 0) delta += 7
  return addDays(dateValue, delta)
}

function timeZoneOffsetMinutes(date, timeZone) {
  const parts = zonedParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return Math.round((asUtc - date.getTime()) / 60000)
}

function zonedDateTimeToDate(dateValue, timeValue, timeZone = DEFAULT_TIME_ZONE) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hour, minute] = timeValue.split(':').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const firstOffset = timeZoneOffsetMinutes(guess, timeZone)
  const adjusted = new Date(guess.getTime() - firstOffset * 60000)
  const secondOffset = timeZoneOffsetMinutes(adjusted, timeZone)
  return new Date(guess.getTime() - secondOffset * 60000)
}

function offsetLabel(date, timeZone) {
  const minutes = timeZoneOffsetMinutes(date, timeZone)
  const sign = minutes >= 0 ? '+' : '-'
  const absolute = Math.abs(minutes)
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}

function localIso(dateValue, timeValue, timeZone = DEFAULT_TIME_ZONE) {
  const instant = zonedDateTimeToDate(dateValue, timeValue, timeZone)
  return `${dateValue}T${timeValue}:00${offsetLabel(instant, timeZone)}`
}

function instantToLocalIso(date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = zonedParts(date, timeZone)
  const dateValue = dateKey(parts)
  const timeValue = `${pad(parts.hour)}:${pad(parts.minute)}`
  return localIso(dateValue, timeValue, timeZone)
}

function localMinutes(parts) {
  return parts.hour * 60 + parts.minute
}

function numberTokenPattern() {
  return '[0-9零〇一二两兩三四五六七八九十]+'
}

function parseMinuteToken(token) {
  if (!token) return 0
  if (token === '半') return 30
  const number = parseChineseNumber(token)
  return Number.isFinite(number) ? number : 0
}

function extractTimeExpressions(text) {
  const expressions = []
  const occupied = []
  const add = value => {
    if (!value) return
    if (occupied.some(([start, end]) => value.index < end && value.end > start)) return
    occupied.push([value.index, value.end])
    expressions.push(value)
  }

  const colon = /(?:(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|夜里|夜间)\s*)?(\d{1,2})[:：](\d{2})/g
  for (const match of text.matchAll(colon)) {
    add({ raw: match[0], period: match[1] || '', hour: Number(match[2]), minute: Number(match[3]), explicitPeriod: Boolean(match[1]), index: match.index, end: match.index + match[0].length })
  }

  const clock = new RegExp(`(?:(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|今晚|夜里|夜间)\\s*)?(${numberTokenPattern()})\\s*(?:点|时)(?:\\s*(半|${numberTokenPattern()})\\s*分?)?`, 'g')
  for (const match of text.matchAll(clock)) {
    const hour = parseChineseNumber(match[2])
    const minute = parseMinuteToken(match[3])
    if (!Number.isFinite(hour)) continue
    add({ raw: match[0], period: match[1] || '', hour, minute, explicitPeriod: Boolean(match[1]), index: match.index, end: match.index + match[0].length })
  }

  return expressions.sort((a, b) => a.index - b.index)
}

function normalizePeriodHour(hour, period) {
  if (!period) return hour
  if (/下午|傍晚|晚上|今晚|夜里|夜间/.test(period)) return hour < 12 ? hour + 12 : hour
  if (period === '中午') {
    if (hour === 0) return 12
    return hour < 11 ? hour + 12 : hour
  }
  if (/凌晨/.test(period)) return hour === 12 ? 0 : hour
  if (/早上|早晨|上午/.test(period)) return hour === 12 ? 0 : hour
  return hour
}

function extractDateExpression(text, nowParts, nightRolloverHour) {
  const today = dateKey(nowParts)
  const explicitDate = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})[日号]?/)
  if (explicitDate) {
    let year = explicitDate[1] ? Number(explicitDate[1]) : nowParts.year
    const candidate = `${year}-${pad(Number(explicitDate[2]))}-${pad(Number(explicitDate[3]))}`
    if (!explicitDate[1] && candidate < today) year += 1
    return { date: `${year}-${pad(Number(explicitDate[2]))}-${pad(Number(explicitDate[3]))}`, raw: explicitDate[0], resolution: 'explicit-date' }
  }

  const weekday = text.match(/(下周)?(?:周|星期)([一二三四五六日天])/)
  if (weekday) {
    return {
      date: nextWeekday(today, weekdayIndex(weekday[2]), Boolean(weekday[1])),
      raw: weekday[0],
      resolution: weekday[1] ? 'next-weekday' : 'upcoming-weekday'
    }
  }

  if (/后天/.test(text)) return { date: addDays(today, 2), raw: '后天', resolution: 'relative-day' }
  const tomorrowMorning = /明早|明天(?:早上|早晨|上午)/.test(text)
  if (tomorrowMorning && nowParts.hour < nightRolloverHour) {
    return { date: today, raw: text.match(/明早|明天(?:早上|早晨|上午)/)?.[0] || '明早', resolution: 'night-rollover' }
  }
  if (/明天|明日|明晚/.test(text)) return { date: addDays(today, 1), raw: text.match(/明天|明日|明晚/)?.[0] || '明天', resolution: 'relative-day' }
  if (/今天|今日|今晚|今早|今晨|本日/.test(text)) return { date: today, raw: text.match(/今天|今日|今晚|今早|今晨|本日/)?.[0] || '今天', resolution: 'relative-day' }
  return { date: '', raw: '', resolution: '' }
}

function resolveClock(clock, { date, nowParts, todayKey, explicitDate }) {
  const normalizedMinute = Math.min(59, Math.max(0, clock.minute || 0))
  const candidates = clock.explicitPeriod
    ? [normalizePeriodHour(clock.hour, clock.period)]
    : [clock.hour, ...(clock.hour >= 1 && clock.hour <= 11 ? [clock.hour + 12] : [])]
  const unique = [...new Set(candidates.filter(hour => hour >= 0 && hour <= 23))]
  const resolution = clock.explicitPeriod ? 'explicit-period' : 'bare-clock'

  if (date && date !== todayKey) {
    return { hour: unique[0], minute: normalizedMinute, resolution }
  }

  const nowMinute = localMinutes(nowParts)
  const future = unique
    .map(hour => ({ hour, minute: normalizedMinute, value: hour * 60 + normalizedMinute }))
    .filter(candidate => candidate.value > nowMinute)
    .sort((a, b) => a.value - b.value)
  if (future.length) {
    return {
      ...future[0],
      resolution: clock.explicitPeriod ? 'explicit-period' : 'same-day-future'
    }
  }

  if (explicitDate) {
    return {
      needsClarification: true,
      clarificationText: `你说的“${clock.raw}”在今天已经过去了。请说明是明天${clock.raw}，还是其他时间。`
    }
  }
  return { hour: unique[0], minute: normalizedMinute, resolution: 'next-instance' }
}

function parseLeadMinutes(text) {
  const start = text.indexOf('提前')
  if (start < 0) return []
  const endMatch = text.slice(start).match(/提醒|通知/)
  const segment = endMatch ? text.slice(start, start + endMatch.index + endMatch[0].length) : text.slice(start)
  const values = []
  const pattern = new RegExp(`(${numberTokenPattern()}|半)\\s*(个)?\\s*(分钟|分|小时|钟头|天|日|周)`, 'g')
  for (const match of segment.matchAll(pattern)) {
    const amount = parseChineseNumber(match[1])
    if (!Number.isFinite(amount)) continue
    const unit = match[3]
    const multiplier = /分钟|分/.test(unit) ? 1 : /小时|钟头/.test(unit) ? 60 : /天|日/.test(unit) ? 1440 : 10080
    values.push(Math.round(amount * multiplier))
  }
  return [...new Set(values.filter(value => value >= 0))].sort((a, b) => b - a)
}

function parseRecurrence(text, nowParts, nightRolloverHour) {
  if (!/每|隔/.test(text)) return undefined
  const result = { basis: /完成后|做完后|每次完成/.test(text) ? 'completion' : 'scheduled' }
  if (/每天|每日/.test(text)) result.rule = 'daily'
  else if (/每个?工作日|每周一到周五/.test(text)) result.rule = 'weekdays'
  else if (/每周/.test(text)) {
    result.rule = 'weekly'
    const days = [...text.matchAll(/(?:周|星期)([一二三四五六日天])/g)].map(match => weekdayIndex(match[1]))
    if (days.length) result.byWeekday = [...new Set(days)]
  } else if (/每月/.test(text)) result.rule = 'monthly'
  else if (/每年/.test(text)) result.rule = 'yearly'
  else {
    const interval = text.match(new RegExp(`每\\s*(${numberTokenPattern()})\\s*(小时|天|周|个月|月)`))
    if (interval) {
      result.interval = parseChineseNumber(interval[1])
      result.unit = interval[2] === '小时' ? 'hour' : interval[2] === '天' ? 'day' : interval[2] === '周' ? 'week' : 'month'
    }
  }
  const count = text.match(new RegExp(`(?:共|总共|重复)\\s*(${numberTokenPattern()})\\s*次`))
  if (count) result.count = parseChineseNumber(count[1])
  const untilMatch = text.match(/(?:直到|到)([^，。；]+?)(?:结束|为止|止|$)/)
  if (untilMatch) {
    const untilDate = extractDateExpression(untilMatch[1], nowParts, nightRolloverHour)
    if (untilDate.date) result.until = untilDate.date
  }
  return result.rule || result.interval ? result : undefined
}

function parseDurationMinutes(text) {
  const match = text.match(new RegExp(`(?:持续|用时|时长)\\s*(${numberTokenPattern()}|半)\\s*(分钟|分|小时|钟头)`))
  if (!match) return undefined
  const value = parseChineseNumber(match[1])
  return Math.round(value * (/小时|钟头/.test(match[2]) ? 60 : 1))
}

function parseLocationTrigger(text) {
  const match = text.match(/(?:到达|到了|进入|离开)([^，。；]{1,30}?)(?:时|的时候)?提醒我/)
  if (!match) return undefined
  return {
    type: /离开/.test(match[0]) ? 'location_leave' : 'location_arrive',
    place: clean(match[1])
  }
}

function parseSnooze(text, now, timeZone) {
  if (!/稍后提醒|过会儿提醒|延后提醒|贪睡|snooze/i.test(text)) return undefined
  const match = text.match(new RegExp(`(${numberTokenPattern()}|半)\\s*(分钟|分|小时|钟头)后`))
  if (!match) return { action: 'snooze' }
  const amount = parseChineseNumber(match[1])
  const minutes = Math.round(amount * (/小时|钟头/.test(match[2]) ? 60 : 1))
  const target = new Date(now.getTime() + minutes * 60000)
  return { action: 'snooze', minutes, until: instantToLocalIso(target, timeZone) }
}

function normalizeBaseTemporal(baseTemporal = {}) {
  const startsAt = baseTemporal.startsAt || undefined
  const dueAt = baseTemporal.dueAt || undefined
  const fallback = startsAt || dueAt
  return {
    startsAt,
    dueAt,
    date: baseTemporal.date || (fallback ? zonedParts(new Date(fallback), baseTemporal.timezone || DEFAULT_TIME_ZONE) : undefined),
    time: baseTemporal.time,
    reminders: Array.isArray(baseTemporal.reminders) ? baseTemporal.reminders : undefined,
    recurrence: baseTemporal.recurrence
  }
}

function absoluteReminderFromSecondClock({ text, clocks, nowParts, nightRolloverHour, timeZone, eventDate }) {
  if (clocks.length < 2 || /提前.+提醒/.test(text)) return undefined
  const reminderMarker = text.lastIndexOf('提醒')
  const clock = [...clocks].reverse().find(candidate => candidate.index < reminderMarker)
  if (!clock || clock === clocks[0]) return undefined
  const segmentStart = Math.max(0, text.lastIndexOf('，', clock.index) + 1, text.lastIndexOf('。', clock.index) + 1, text.lastIndexOf(';', clock.index) + 1)
  const segment = text.slice(segmentStart, reminderMarker + 2)
  const dateInfo = extractDateExpression(segment, nowParts, nightRolloverHour)
  const date = dateInfo.date || eventDate
  if (!date) return undefined
  const resolved = resolveClock(clock, {
    date,
    nowParts,
    todayKey: dateKey(nowParts),
    explicitDate: date === dateKey(nowParts) && Boolean(dateInfo.raw)
  })
  if (resolved.needsClarification) return { needsClarification: true, clarificationText: resolved.clarificationText }
  const time = `${pad(resolved.hour)}:${pad(resolved.minute)}`
  return {
    enabled: true,
    mode: 'absolute',
    channel: 'wechat',
    remindAt: zonedDateTimeToDate(date, time, timeZone).toISOString(),
    explicitlyRequested: true
  }
}

export function resolveTemporalSemantics(input, {
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
  nightRolloverHour = DEFAULT_NIGHT_ROLLOVER_HOUR,
  defaultReminderChannel = 'wechat',
  baseTemporal = {}
} = {}) {
  const text = clean(input)
  const eventText = /每|隔/.test(text)
    ? text.replace(/(?:，?\s*(?:直到|到)[^，。；]+?(?:为止|结束|止))/g, '')
    : text
  const nowParts = zonedParts(now, timeZone)
  const todayKey = dateKey(nowParts)
  const dateInfo = extractDateExpression(eventText, nowParts, nightRolloverHour)
  const clocks = extractTimeExpressions(eventText)
  const clock = clocks[0]
  let resolvedDate = dateInfo.date
  let clockResult

  if (clock) {
    clockResult = resolveClock(clock, {
      date: resolvedDate,
      nowParts,
      todayKey,
      explicitDate: resolvedDate === todayKey && Boolean(dateInfo.raw)
    })
    if (clockResult.needsClarification) {
      return {
        needsClarification: true,
        clarificationText: clockResult.clarificationText,
        timezone: timeZone,
        raw: { date: dateInfo.raw, time: clock.raw }
      }
    }
    if (!resolvedDate) {
      const value = clockResult.hour * 60 + clockResult.minute
      resolvedDate = value > localMinutes(nowParts) ? todayKey : addDays(todayKey, 1)
    }
  }

  const time = clockResult ? `${pad(clockResult.hour)}:${pad(clockResult.minute)}` : ''
  const resolvedAt = resolvedDate && time ? localIso(resolvedDate, time, timeZone) : undefined
  const deadlineIntent = /截止|最晚|不得晚于|必须在.+(?:前|之前)|(?:点|时|日|号|日期)前(?:提交|完成|交|办)|deadline|ddl/i.test(text)
  const base = normalizeBaseTemporal({ ...baseTemporal, timezone: timeZone })
  const startsAt = deadlineIntent ? undefined : (resolvedAt || base.startsAt)
  const dueAt = deadlineIntent ? resolvedAt : (!resolvedAt ? base.dueAt : undefined)
  const allDay = Boolean(resolvedDate && !time)
  const durationMinutes = parseDurationMinutes(text)
  const endsAt = startsAt && durationMinutes
    ? instantToLocalIso(new Date(new Date(startsAt).getTime() + durationMinutes * 60000), timeZone)
    : undefined
  const leadMinutes = parseLeadMinutes(text)
  const reminderRequested = /提醒我|记得提醒|到时提醒|提前.+提醒|别忘了/.test(text)
  const locationTrigger = parseLocationTrigger(text)
  const reminders = []

  if (locationTrigger) {
    reminders.push({ enabled: true, mode: 'trigger', channel: defaultReminderChannel, trigger: locationTrigger, explicitlyRequested: true })
  } else {
    const absolute = absoluteReminderFromSecondClock({
      text,
      clocks,
      nowParts,
      nightRolloverHour,
      timeZone,
      eventDate: resolvedDate || (base.startsAt || base.dueAt ? dateKey(zonedParts(new Date(base.startsAt || base.dueAt), timeZone)) : '')
    })
    if (absolute?.needsClarification) {
      return {
        needsClarification: true,
        clarificationText: absolute.clarificationText,
        timezone: timeZone,
        raw: { date: dateInfo.raw, time: clock?.raw }
      }
    }
    if (absolute) reminders.push({ ...absolute, channel: defaultReminderChannel })
    else if (reminderRequested && (startsAt || dueAt)) {
      const reminderBase = startsAt || dueAt
      if (leadMinutes.length) {
        const starts = new Date(reminderBase)
        for (const lead of leadMinutes) {
          reminders.push({
            enabled: true,
            mode: 'before',
            channel: defaultReminderChannel,
            leadMinutes: lead,
            remindAt: new Date(starts.getTime() - lead * 60000).toISOString(),
            explicitlyRequested: true
          })
        }
      } else {
        reminders.push({
          enabled: true,
          mode: 'at',
          channel: defaultReminderChannel,
          leadMinutes: 0,
          remindAt: new Date(reminderBase).toISOString(),
          explicitlyRequested: true
        })
      }
    }
  }

  if (reminderRequested && leadMinutes.length && !(startsAt || dueAt)) {
    return {
      needsClarification: true,
      clarificationText: '我知道你想提前提醒，但还不知道对应事项的时间。请补充事项名称或发生时间。',
      timezone: timeZone
    }
  }

  const recurrence = parseRecurrence(text, nowParts, nightRolloverHour) || (!resolvedAt ? base.recurrence : undefined)
  const result = {
    timezone: timeZone,
    date: resolvedDate || undefined,
    time: time || undefined,
    startsAt,
    dueAt,
    endsAt,
    allDay: allDay || undefined,
    durationMinutes,
    resolution: [dateInfo.resolution, clockResult?.resolution, !resolvedAt && (base.startsAt || base.dueAt) ? 'conversation-base' : ''].filter(Boolean).join('+') || undefined,
    reminders: reminders.length ? reminders : undefined,
    recurrence,
    snooze: parseSnooze(text, now, timeZone),
    raw: {
      date: dateInfo.raw || undefined,
      time: clock?.raw || undefined
    }
  }
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined && !(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)))
}

export function primaryReminder(reminders = []) {
  return Array.isArray(reminders) && reminders.length ? reminders[0] : undefined
}
