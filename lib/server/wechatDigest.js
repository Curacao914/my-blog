import { buildTodaySnapshot } from '@/lib/server/todaySnapshot'

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

function escapeMarkdownLabel(value) {
  return clean(value)
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}

function absoluteUrl(siteUrl, value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${String(siteUrl || 'https://law-tech.dev').replace(/\/$/, '')}${value.startsWith('/') ? value : `/${value}`}`
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

function uniqueItems(items = [], { reading = false } = {}) {
  const seen = new Set()
  return items.filter(item => {
    const title = clean(item?.title || '未命名事项')
    if (reading && PLACEHOLDER_READING_TITLES.has(title)) return false
    const key = normalizedTitle(title)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatDate(value) {
  const match = clean(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return clean(value)
  return `${Number(match[2])}月${Number(match[3])}日`
}

function overdueDays(date, todayKey) {
  if (!date || !todayKey || date >= todayKey) return 0
  const start = new Date(`${date}T00:00:00Z`)
  const end = new Date(`${todayKey}T00:00:00Z`)
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
}

function actionLines(item = {}, index, todayKey) {
  const title = escapeMarkdownLabel(item.title || '未命名事项')
  const lines = [`${index + 1}. ${title}`]
  const date = clean(item.date)
  const details = []
  const dateTime = [
    date && !['today', 'none', 'reading'].includes(date)
      ? formatDate(date)
      : '',
    clean(item.time)
  ].filter(Boolean).join(' ')
  if (dateTime) details.push(dateTime)
  if (clean(item.place)) details.push(clean(item.place))
  const late = overdueDays(date, todayKey)
  if (late) details.push(`已逾期${late}天`)
  if (details.length) lines.push(`   ${details.join(' · ')}`)
  return lines
}

function readingLines(item = {}, index, siteUrl) {
  const url = firstUrl(item) || absoluteUrl(siteUrl, '/desk/reading')
  return [
    `${index + 1}. [${escapeMarkdownLabel(item.title || '未命名内容')}](${url})`
  ]
}

function briefLines(item = {}, index, siteUrl) {
  const url = absoluteUrl(siteUrl, item.url)
  const lines = [
    `${index + 1}. [${escapeMarkdownLabel(item.title)}](${url})`
  ]
  if (item.mainLine) lines.push(`   ${clean(item.mainLine)}`)
  return lines
}

function section(title, items = [], formatter, limit) {
  const visible = items.slice(0, limit)
  if (!visible.length) return ''
  const lines = [
    `**${title} · ${items.length}**`,
    '',
    ...visible.flatMap((item, index) => formatter(item, index))
  ]
  if (items.length > visible.length) {
    lines.push('', `另有 ${items.length - visible.length} 项`)
  }
  return lines.join('\n')
}

export function buildWechatScheduleDigest({
  snapshot,
  items = [],
  courseBriefs = [],
  now = new Date(),
  timezone = 'Asia/Shanghai',
  siteUrl = 'https://law-tech.dev'
}) {
  const data = snapshot || buildTodaySnapshot({
    items,
    courseBriefs,
    now,
    timezone
  })
  const overdue = uniqueItems(data.overdue)
  const today = uniqueItems(data.today)
  const tomorrow = uniqueItems(data.tomorrow)
  const upcoming = uniqueItems(data.upcoming)
  const reading = uniqueItems(data.allReading || data.reading, {
    reading: true
  })
  const briefs = uniqueItems(data.unreadCourseBriefs || [])

  const blocks = [
    section(
      '需要先处理',
      overdue,
      (item, index) => actionLines(item, index, data.todayKey),
      8
    ),
    section(
      '今天',
      today,
      (item, index) => actionLines(item, index, data.todayKey),
      8
    ),
    section(
      '明天',
      tomorrow,
      (item, index) => actionLines(item, index, data.todayKey),
      5
    ),
    section(
      '未来七天',
      upcoming,
      (item, index) => actionLines(item, index, data.todayKey),
      5
    ),
    section(
      '待读',
      reading,
      (item, index) => readingLines(item, index, siteUrl),
      6
    ),
    section(
      '未读课程简报',
      briefs,
      (item, index) => briefLines(item, index, siteUrl),
      6
    )
  ].filter(Boolean)

  const workspaceUrl = absoluteUrl(siteUrl, '/desk/today')

  return {
    dateKey: data.todayKey,
    bodyText: [
      `**${data.todayKey} · 今日概况**`,
      '',
      ...(blocks.length
        ? blocks.flatMap((block, index) =>
            index ? ['', block] : [block]
          )
        : ['今天没有待处理、待读或未读课程简报。']),
      '',
      '[打开今日工作台](' + workspaceUrl + ')',
      '',
      '回复“查看全部待处理”“查看全部待读”或“查看未读课程简报”可展开。',
      '',
      '看到我记得喝口水。'
    ].join('\n')
  }
}
