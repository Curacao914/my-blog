import {
  buildDailyDigestSections,
  REMINDER_TIME_ZONE
} from '@/lib/domain/reminderDigest'

const PLACEHOLDER_READING_TITLES = new Set([
  '公众号文章',
  '其他内容',
  '未命名事项',
  '阅读内容'
])

function clean(value) {
  return String(value || '').trim()
}

function normalizedTitle(value) {
  return clean(value)
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s·•—–_\-，。！？、：；"'“”‘’()[\]【】]/g, '')
}

function firstUrl(item = {}) {
  const links = Array.isArray(item.links) ? item.links : []
  for (const link of links) {
    const value = typeof link === 'string'
      ? link
      : link?.url || link?.href || ''
    if (/^https?:\/\//i.test(clean(value))) return clean(value)
  }
  return ''
}

function escapeMarkdownLabel(value) {
  return clean(value)
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}

function uniqueItems(items = [], { reading = false } = {}) {
  const seen = new Set()
  return items.filter(item => {
    const title = clean(item?.title || '未命名事项')
    if (
      reading &&
      PLACEHOLDER_READING_TITLES.has(title)
    ) {
      return false
    }

    const key = normalizedTitle(title)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatDate(value) {
  const match = clean(value).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  )
  if (!match) return clean(value)
  return `${Number(match[2])}月${Number(match[3])}日`
}

function when(item = {}) {
  const values = [
    formatDate(item.date),
    clean(item.time),
    clean(item.place)
  ].filter(value =>
    value &&
    !['today', 'none', 'reading'].includes(value)
  )
  return values.join(' ')
}

function displayTitle(item = {}, linkTitle = false) {
  const title = clean(item.title || '未命名事项')
  const url = linkTitle ? firstUrl(item) : ''
  return url
    ? `[${escapeMarkdownLabel(title)}](${url})`
    : escapeMarkdownLabel(title)
}

function rows(
  title,
  items = [],
  {
    limit = 5,
    reading = false
  } = {}
) {
  const unique = uniqueItems(items, { reading })
  if (!unique.length) return ''

  const visible = unique.slice(0, limit)
  return [
    `**${title} · ${unique.length}**`,
    ...visible.map(item => {
      const detail = reading ? '' : when(item)
      return `- ${displayTitle(item, reading)}${
        detail ? `｜${detail}` : ''
      }`
    }),
    unique.length > visible.length
      ? `- 另有 ${unique.length - visible.length} 项`
      : ''
  ].filter(Boolean).join('\n')
}

export function buildWechatScheduleDigest({
  items = [],
  now = new Date(),
  timezone = REMINDER_TIME_ZONE,
  siteUrl = 'https://law-tech.dev'
}) {
  const sections = buildDailyDigestSections(
    items,
    now,
    timezone
  )
  const blocks = [
    rows('需要先处理', sections.overdue, { limit: 5 }),
    rows('今天', sections.today, { limit: 6 }),
    rows('明天', sections.tomorrow, { limit: 4 }),
    rows('未来七天', sections.upcoming, { limit: 4 }),
    rows('待读', sections.reading, {
      limit: 4,
      reading: true
    })
  ].filter(Boolean)

  const workspaceUrl =
    `${siteUrl.replace(/\/$/, '')}/desk/today`

  return {
    dateKey: sections.todayKey,
    bodyText: [
      `**${sections.todayKey}｜今日安排**`,
      '',
      ...(blocks.length
        ? blocks.flatMap((block, index) =>
            index ? ['', block] : [block]
          )
        : ['今天没有排进日程的事项。']),
      '',
      `[打开今日工作台](${workspaceUrl})`,
      '',
      '看到我记得喝口水。'
    ].join('\n')
  }
}
