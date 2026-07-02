import {
  buildDailyDigestSections,
  buildWeeklyReview,
  digestHasContent,
  isMondayInTimeZone,
  REMINDER_TIME_ZONE
} from '@/lib/domain/reminderDigest'

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function itemWhen(item) {
  return [item?.date || item?.schedule_date, item?.time || item?.time_label].filter(value => value && value !== 'today' && value !== 'none').join(' ')
}

function itemText(item) {
  return [item?.title || '未命名事项', itemWhen(item), item?.place].filter(Boolean).join(' · ')
}

const MAX_SECTION_ITEMS = 12

function textSection(title, items) {
  if (!items?.length) return ''
  const visible = items.slice(0, MAX_SECTION_ITEMS)
  const remaining = items.length - visible.length
  return [
    title,
    ...visible.map(item => `- ${itemText(item)}`),
    remaining > 0 ? `- 另有 ${remaining} 项，请在工作台查看` : ''
  ].filter(Boolean).join('\n') + '\n'
}

function htmlSection(title, items) {
  if (!items?.length) return ''
  const visible = items.slice(0, MAX_SECTION_ITEMS)
  const remaining = items.length - visible.length
  return `<section style="margin:0 0 24px"><h2 style="margin:0 0 10px;font-size:16px;color:#183f32">${escapeHtml(title)}</h2><ul style="margin:0;padding-left:20px;color:#2d3d35;line-height:1.75">${visible.map(item => `<li><strong>${escapeHtml(item?.title || '未命名事项')}</strong>${itemWhen(item) ? `<span style="color:#69756f"> · ${escapeHtml(itemWhen(item))}</span>` : ''}${item?.place ? `<span style="color:#69756f"> · ${escapeHtml(item.place)}</span>` : ''}</li>`).join('')}${remaining > 0 ? `<li style="color:#69756f">另有 ${remaining} 项，请在工作台查看</li>` : ''}</ul></section>`
}

function reminderPayloadRows(reminders = [], items = []) {
  const listedIds = new Set(items.map(item => item?.id).filter(Boolean))
  return reminders
    .filter(reminder => !listedIds.has(reminder?.schedule_item_id))
    .map(reminder => ({
      title: reminder?.payload?.title || '未命名事项',
      date: reminder?.payload?.date || '',
      time: reminder?.payload?.time || '',
      place: reminder?.payload?.place || ''
    }))
}

export function buildDigestEmail({ items = [], reminders = [], now = new Date(), weeklyEnabled = false, siteUrl = 'https://law-tech.dev' }) {
  const sections = buildDailyDigestSections(items, now, REMINDER_TIME_ZONE)
  const weeklyReview = weeklyEnabled && isMondayInTimeZone(now, REMINDER_TIME_ZONE)
    ? buildWeeklyReview(items, now, REMINDER_TIME_ZONE)
    : null
  const reminderItems = reminderPayloadRows(reminders, items)
  const hasContent = digestHasContent(sections, reminderItems, weeklyReview)
  const subject = `${sections.todayKey} · 今日安排${sections.today.length ? `（${sections.today.length}）` : ''}`

  const text = [
    `早上好。今天是 ${sections.todayKey}。`,
    '',
    textSection('需要先处理', sections.overdue),
    textSection('今天', sections.today),
    textSection('接下来 24 小时的提醒', reminderItems),
    textSection('明天', sections.tomorrow),
    textSection('未来七天', sections.upcoming),
    textSection('待读', sections.reading),
    !hasContent ? '今天没有排进日程的事项，可以从一杯水开始。\n' : '',
    weeklyReview ? textSection('本周标记完成', weeklyReview.completed) : '',
    `打开工作台：${siteUrl.replace(/\/$/, '')}/desk/today`,
    '',
    '看到我记得喝口水。'
  ].filter(Boolean).join('\n')

  const emptyHtml = hasContent ? '' : '<section style="margin:0 0 24px;border-radius:16px;padding:16px;background:rgba(220,233,223,.45);color:#355347">今天没有排进日程的事项，可以从一杯水开始。</section>'
  const html = `<div style="margin:0;background:#f7f6f1;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;color:#17231d"><main style="max-width:620px;margin:0 auto;border:1px solid rgba(24,63,50,.1);border-radius:24px;padding:28px;background:rgba(255,255,255,.82);box-shadow:0 20px 60px rgba(24,63,50,.08)"><p style="margin:0 0 8px;color:#69756f;font-size:12px;letter-spacing:.12em;text-transform:uppercase">law-tech daily</p><h1 style="margin:0 0 8px;font-family:Georgia,'Songti SC',serif;font-size:30px;font-weight:600">${escapeHtml(sections.todayKey)} · 今日安排</h1><p style="margin:0 0 26px;color:#69756f;line-height:1.7">看到我记得喝口水。</p>${emptyHtml}${htmlSection('需要先处理', sections.overdue)}${htmlSection('今天', sections.today)}${htmlSection('接下来 24 小时的提醒', reminderItems)}${htmlSection('明天', sections.tomorrow)}${htmlSection('未来七天', sections.upcoming)}${htmlSection('待读', sections.reading)}${weeklyReview ? htmlSection('本周标记完成', weeklyReview.completed) : ''}<a href="${escapeHtml(siteUrl.replace(/\/$/, '') + '/desk/today')}" style="display:inline-block;margin-top:4px;border-radius:999px;padding:10px 16px;color:#fffaf0;background:#183f32;text-decoration:none;font-weight:650">打开今日工作台</a><p style="margin:24px 0 0;color:#8a938f;font-size:11px;line-height:1.6">这封邮件由你在 law-tech.dev 的提醒设置触发。</p></main></div>`

  return { subject, text, html, hasContent, sections, weeklyReview }
}
