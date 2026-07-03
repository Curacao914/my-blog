const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

const CHINESE_DIGITS = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseNumber(value) {
  const text = clean(value)
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text)
  if (text === '半') return 0.5
  if (text === '十') return 10
  if (/^十[一二两兩三四五六七八九]$/.test(text)) {
    return 10 + CHINESE_DIGITS[text[1]]
  }
  if (/^[一二两兩三四五六七八九]十$/.test(text)) {
    return CHINESE_DIGITS[text[0]] * 10
  }
  if (/^[一二两兩三四五六七八九]十[一二两兩三四五六七八九]$/.test(text)) {
    return CHINESE_DIGITS[text[0]] * 10 + CHINESE_DIGITS[text[2]]
  }
  if (text.length === 1 && Object.prototype.hasOwnProperty.call(CHINESE_DIGITS, text)) {
    return CHINESE_DIGITS[text]
  }
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
    hourCycle: 'h23'
  }).formatToParts(date)
  return Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  )
}

function explicitDateTime(date, timeZone) {
  const parts = zonedParts(date, timeZone)
  return `${Number(parts.year)}年${Number(parts.month)}月${Number(parts.day)}日${parts.hour}:${parts.minute}`
}

function normalizeRelativeOffset(text, { now, timeZone }) {
  const number = '[0-9零〇一二两兩三四五六七八九十半]+'
  const pattern = new RegExp(`(^|[，,。；;\\s])(${number})\\s*(分钟|分|小时|钟头|天|日)后`)
  const match = text.match(pattern)
  if (!match) return text

  const amount = parseNumber(match[2])
  if (!Number.isFinite(amount) || amount < 0) return text

  const multiplier = /小时|钟头/.test(match[3])
    ? 60
    : /天|日/.test(match[3])
      ? 1440
      : 1
  const minutes = Math.round(amount * multiplier)
  const target = new Date(now.getTime() + minutes * 60000)
  const replacement = `${match[1]}${explicitDateTime(target, timeZone)}`
  return text.replace(match[0], replacement)
}

function normalizeSpeechRecognition(text) {
  return text
    .replace(/全部带读/g, '全部待读')
    .replace(/带读/g, '待读')
    .replace(/所有\s*(?:还没有读|还没读|尚未读|没有读过|没读过)\s*的?/g, '未读')
    .replace(/(?:还没有读|还没读|尚未读|没有读过|没读过)/g, '未读')
}

function normalizeFollowUpPrefix(text) {
  return text.replace(
    /^(?:请)?(?:把)?(?:日程)?时间\s*(?:改|调整|换|挪)(?:到|成|为)?\s*/,
    '改到'
  )
}

export function normalizeOpenClawInput(input, {
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE
} = {}) {
  const safeNow = Number.isNaN(new Date(now).getTime())
    ? new Date()
    : new Date(now)
  const originalText = clean(input)
  let text = normalizeSpeechRecognition(originalText)
  text = normalizeFollowUpPrefix(text)
  text = normalizeRelativeOffset(text, {
    now: safeNow,
    timeZone
  })
  return {
    text: clean(text),
    originalText,
    changed: clean(text) !== originalText
  }
}
