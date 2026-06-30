import {
  buildDailyDigestSections,
  REMINDER_TIME_ZONE
} from '@/lib/domain/reminderDigest'

function when(item = {}) {
  return [item.date, item.time, item.place]
    .filter(value => value && value !== 'today' && value !== 'none')
    .join(' · ')
}

function rows(title, items = [], limit = 8) {
  if (!items.length) return ''
  const visible = items.slice(0, limit)
  return [
    `【${title}】`,
    ...visible.map(item => `• ${item.title || '未命名事项'}${when(item) ? ` · ${when(item)}` : ''}`),
    items.length > visible.length ? `• 另有 ${items.length - visible.length} 项，请在工作台查看` : ''
  ].filter(Boolean).join('\n')
}

export function buildWechatScheduleDigest({
  items = [],
  now = new Date(),
  timezone = REMINDER_TIME_ZONE,
  siteUrl = 'https://law-tech.dev'
}) {
  const sections = buildDailyDigestSections(items, now, timezone)
  const blocks = [
    rows('需要先处理', sections.overdue),
    rows('今天', sections.today),
    rows('明天', sections.tomorrow),
    rows('未来七天', sections.upcoming),
    rows('待读', sections.reading)
  ].filter(Boolean)

  return {
    dateKey: sections.todayKey,
    bodyText: [
      `${sections.todayKey} · 今日安排`,
      '',
      ...(blocks.length ? blocks : ['今天没有排进日程的事项。']),
      '',
      `打开工作台：${siteUrl.replace(/\/$/, '')}/desk/today`,
      '',
      '看到我记得喝口水。'
    ].join('\n')
  }
}
