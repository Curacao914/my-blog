import { loadTodaySnapshot } from '@/lib/server/todaySnapshot'

const MAX_RESULTS = 20

function clean(value) {
  return String(value || '').trim()
}

function absoluteUrl(siteUrl, value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${String(siteUrl || 'https://law-tech.dev').replace(/\/$/, '')}${value.startsWith('/') ? value : `/${value}`}`
}

function firstUrl(item = {}) {
  const links = Array.isArray(item.links) ? item.links : []
  for (const link of links) {
    const value = typeof link === 'string' ? link : link?.url || link?.href
    if (/^https?:\/\//i.test(clean(value))) return clean(value)
  }
  return ''
}

function dateLabel(value) {
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

function scheduleCandidate(item = {}, todayKey = '', siteUrl = '') {
  const date = clean(item.date || item.schedule_date)
  const time = clean(item.time || item.time_label)
  const place = clean(item.place)
  const details = []
  if (date && !['none', 'reading', 'today'].includes(date)) {
    details.push(dateLabel(date))
  }
  if (time) details.push(time)
  if (place) details.push(place)
  const late = overdueDays(date, todayKey)
  if (late) details.push(`已逾期${late}天`)
  const isReading = item.contentType === 'reading' ||
    item.content_type === 'reading' ||
    item.date === 'reading'

  return {
    type: isReading ? 'reading' : 'schedule',
    id: item.id || '',
    title: clean(item.title) || '未命名事项',
    detail: details.join(' · '),
    url: isReading
      ? firstUrl(item) || absoluteUrl(siteUrl, '/desk/reading')
      : absoluteUrl(siteUrl, '/desk/today'),
    date,
    time,
    place
  }
}

function briefCandidate(item = {}, siteUrl = '') {
  return {
    type: 'course_brief',
    id: item.id,
    jobId: item.jobId,
    lessonKey: item.lessonKey,
    fingerprint: item.fingerprint,
    title: item.title,
    detail: item.mainLine || '',
    updatedAt: item.updatedAt,
    read: Boolean(item.read),
    url: absoluteUrl(siteUrl, item.url),
    noteUrl: absoluteUrl(siteUrl, item.noteUrl)
  }
}

function markdownLabel(value) {
  return clean(value)
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
}

function candidateLine(candidate, index) {
  const title = candidate.url
    ? `[${markdownLabel(candidate.title)}](${candidate.url})`
    : markdownLabel(candidate.title)
  const lines = [`${index + 1}. ${title}`]
  if (candidate.detail) lines.push(`   ${candidate.detail}`)
  return lines.join('\n')
}

function block(title, candidates = [], limit = MAX_RESULTS) {
  if (!candidates.length) return ''
  const visible = candidates.slice(0, limit)
  const lines = [
    `【${title} · ${candidates.length}】`,
    '',
    ...visible.map((item, index) => candidateLine(item, index))
  ]
  if (candidates.length > visible.length) {
    lines.push('', `另有 ${candidates.length - visible.length} 项，可到网页查看。`)
  }
  return lines.join('\n')
}

function response(replyText, candidates = [], extra = {}) {
  return {
    ok: true,
    status: 'completed',
    action: 'query',
    replyText,
    results: candidates,
    candidates,
    lastObject: candidates[0] || null,
    ...extra
  }
}

function overview(snapshot, siteUrl) {
  const overdue = snapshot.overdue.map(item =>
    scheduleCandidate(item, snapshot.todayKey, siteUrl)
  )
  const today = snapshot.today.map(item =>
    scheduleCandidate(item, snapshot.todayKey, siteUrl)
  )
  const reading = snapshot.allReading.map(item =>
    scheduleCandidate(item, snapshot.todayKey, siteUrl)
  )
  const briefs = snapshot.unreadCourseBriefs.map(item =>
    briefCandidate(item, siteUrl)
  )
  const candidates = [...overdue, ...today, ...reading, ...briefs]
  const blocks = [
    block('需要先处理', overdue, 8),
    block('今天', today, 8),
    block('待读', reading, 6),
    block('未读课程简报', briefs, 6)
  ].filter(Boolean)

  const replyText = [
    `**${snapshot.todayKey} · 今日概况**`,
    '',
    ...(blocks.length
      ? blocks.flatMap((value, index) => index ? ['', value] : [value])
      : ['今天没有待处理、待读或未读课程简报。']),
    '',
    '[打开今日工作台](' + absoluteUrl(siteUrl, '/desk/today') + ')',
    '',
    '可继续回复“查看全部待处理”“查看全部待读”或“查看未读课程简报”。'
  ].join('\n')

  return response(replyText, candidates, {
    route: 'schedule.list.today',
    snapshotCounts: snapshot.counts
  })
}

export function describeOpenClawCandidate(candidate = {}) {
  if (!candidate?.title) return '没有找到可选择的内容。'
  const lines = [`已选择：${candidate.title}`]
  if (candidate.detail) lines.push(candidate.detail)
  if (candidate.url) lines.push(`[打开](${candidate.url})`)
  if (candidate.type === 'course_brief') {
    lines.push('回复“读完了”可将这份课程简报标记为已读。')
  }
  return lines.join('\n')
}

export function buildOpenClawQueryResult({
  classification = {},
  snapshot,
  siteUrl = 'https://law-tech.dev'
} = {}) {
  const domain = classification.domain
  const scope = classification.scope || ''

  if (domain === 'course') {
    const briefs = (
      scope === 'all'
        ? snapshot.courseBriefs
        : snapshot.unreadCourseBriefs
    ).map(item => briefCandidate(item, siteUrl))
    const title = scope === 'all' ? '全部课程简报' : '未读课程简报'
    const warning = snapshot.courseBriefReadMigrationMissing
      ? '\n\n已显示简报；已读状态表尚未迁移，暂时都会按未读处理。'
      : ''
    return response(
      briefs.length
        ? `${block(title, briefs)}${warning}\n\n回复序号可选择一份，随后回复“读完了”即可标记已读。`
        : `没有${scope === 'all' ? '' : '未读'}课程简报。`,
      briefs,
      {
        route: `course.list.${scope || 'unread'}`,
        migrationMissing: snapshot.courseBriefReadMigrationMissing
      }
    )
  }

  if (domain === 'reading') {
    const readings = snapshot.allReading.map(item =>
      scheduleCandidate(item, snapshot.todayKey, siteUrl)
    )
    return response(
      readings.length
        ? `${block('全部待读', readings)}\n\n[打开阅读库](${absoluteUrl(siteUrl, '/desk/reading')})`
        : '当前没有待读内容。',
      readings,
      { route: 'reading.list.all' }
    )
  }

  if (domain === 'schedule' && scope === 'overdue') {
    const items = snapshot.overdue.map(item =>
      scheduleCandidate(item, snapshot.todayKey, siteUrl)
    )
    return response(
      items.length ? block('需要先处理', items) : '当前没有逾期事项。',
      items,
      { route: 'schedule.list.overdue' }
    )
  }

  if (domain === 'schedule' && scope === 'tomorrow') {
    const items = snapshot.tomorrow.map(item =>
      scheduleCandidate(item, snapshot.todayKey, siteUrl)
    )
    return response(
      items.length ? block('明天', items) : '明天没有安排。',
      items,
      { route: 'schedule.list.tomorrow' }
    )
  }

  if (domain === 'schedule' && scope === 'week') {
    const items = [
      ...snapshot.today,
      ...snapshot.tomorrow,
      ...snapshot.upcoming
    ].map(item => scheduleCandidate(item, snapshot.todayKey, siteUrl))
    return response(
      items.length ? block('未来七天', items) : '未来七天没有安排。',
      items,
      { route: 'schedule.list.week' }
    )
  }

  if (domain === 'schedule' && scope === 'all') {
    const items = snapshot.pending.map(item =>
      scheduleCandidate(item, snapshot.todayKey, siteUrl)
    )
    return response(
      items.length
        ? `${block('全部待处理', items)}\n\n[打开今日工作台](${absoluteUrl(siteUrl, '/desk/today')})`
        : '当前没有待处理事项。',
      items,
      { route: 'schedule.list.all' }
    )
  }

  return overview(snapshot, siteUrl)
}

export async function executeOpenClawQuery({
  ownerId,
  classification,
  now = new Date(),
  siteUrl = 'https://law-tech.dev'
} = {}) {
  const snapshot = await loadTodaySnapshot({
    ownerId,
    now,
    timezone: 'Asia/Shanghai'
  })
  return buildOpenClawQueryResult({
    classification,
    snapshot,
    siteUrl
  })
}
