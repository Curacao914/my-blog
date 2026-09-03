import { buildQuerySpec, objectRef } from './contracts'
import { loadTodaySnapshot } from '@/lib/server/todaySnapshot'
import { fromDbScheduleItem } from '@/lib/domain/schedule'
import { listScheduleRows } from '@/lib/server/supabase'

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

function scheduleCandidate(item = {}, siteUrl = '') {
  return {
    type:
      item.contentType === 'reading' ||
      item.sectionKey === 'reading' ||
      item.date === 'reading'
        ? 'reading'
        : 'schedule',
    id: item.id || '',
    title: clean(item.title) || '未命名事项',
    date: clean(item.date),
    time: clean(item.time),
    place: clean(item.place),
    status: clean(item.status),
    updatedAt: item.updatedAt || '',
    version: item.updatedAt || item.aiTrace?.version || '',
    contentType: item.contentType || 'action',
    item,
    url:
      item.contentType === 'reading'
        ? firstUrl(item) || absoluteUrl(siteUrl, '/desk/reading')
        : absoluteUrl(siteUrl, '/desk/today')
  }
}

function courseBriefCandidate(item = {}, siteUrl = '') {
  return {
    type: 'course_brief',
    id: item.id || `${item.jobId}:${item.lessonKey}`,
    jobId: item.jobId,
    lessonKey: item.lessonKey,
    title: item.title,
    courseName: item.courseName || '',
    teacher: item.teacher || '',
    lessonTitle: item.lessonTitle || '',
    mainLine: item.mainLine || '',
    read: Boolean(item.read),
    readAt: item.readAt || '',
    updatedAt: item.updatedAt || '',
    version: item.fingerprint || item.updatedAt || '',
    fingerprint: item.fingerprint || '',
    url: absoluteUrl(siteUrl, item.url),
    noteUrl: absoluteUrl(siteUrl, item.noteUrl),
    item
  }
}

function uniqueById(values = []) {
  const seen = new Set()
  return values.filter(item => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function scheduleScope(snapshot, scope) {
  if (scope === 'today') return snapshot.today || []
  if (scope === 'tomorrow') return snapshot.tomorrow || []
  if (scope === 'week') {
    return [
      ...(snapshot.today || []),
      ...(snapshot.tomorrow || []),
      ...(snapshot.upcoming || [])
    ]
  }
  if (scope === 'overdue') return snapshot.overdue || []
  return snapshot.pending || []
}

export async function loadResourceCatalog({
  ownerId,
  plan,
  now = new Date(),
  timeZone = 'Asia/Shanghai',
  siteUrl = 'https://law-tech.dev',
  loadSnapshot = loadTodaySnapshot,
  listRows = listScheduleRows
} = {}) {
  const snapshot = await loadSnapshot({
    ownerId,
    now,
    timezone: timeZone
  })
  const capability = plan.capability || ''
  const deletionItems = capability.endsWith('.delete')
    ? ((await listRows(ownerId)) || []).map(fromDbScheduleItem)
    : null
  let candidates = []
  let querySpec = null

  if (capability.startsWith('schedule.')) {
    const values = (deletionItems || scheduleScope(snapshot, plan.scope))
      .filter(item =>
        !(
          item.contentType === 'reading' ||
          item.sectionKey === 'reading' ||
          item.date === 'reading'
        )
      )
      .map(item => scheduleCandidate(item, siteUrl))
    candidates = uniqueById(values)
    querySpec = buildQuerySpec({
      resource: 'schedule',
      filters: {
        scope: plan.scope,
        status: 'active'
      },
      sort: [{ field: 'date', direction: 'asc' }],
      limit: 100
    })
  } else if (capability.startsWith('reading.')) {
    const values = deletionItems
      ? deletionItems.filter(item =>
          item.contentType === 'reading' ||
          item.sectionKey === 'reading' ||
          item.date === 'reading'
        )
      : snapshot.allReading || []
    candidates = uniqueById(
      values.map(item =>
        scheduleCandidate(item, siteUrl)
      )
    )
    querySpec = buildQuerySpec({
      resource: 'reading',
      filters: {
        status: 'active'
      },
      sort: [{ field: 'updatedAt', direction: 'desc' }],
      limit: 100
    })
  } else if (capability.startsWith('course.brief.')) {
    const values =
      plan.scope === 'all_unread'
        ? snapshot.unreadCourseBriefs || []
        : plan.scope === 'all'
          ? snapshot.courseBriefs || []
          : snapshot.courseBriefs || []
    candidates = uniqueById(
      values.map(item => courseBriefCandidate(item, siteUrl))
    )
    querySpec = buildQuerySpec({
      resource: 'course_brief',
      filters: {
        read:
          plan.scope === 'all_unread'
            ? false
            : plan.target?.filters?.read
      },
      sort: [{ field: 'updatedAt', direction: 'desc' }],
      limit: 100
    })
  }

  return {
    querySpec,
    candidates,
    counts: snapshot.counts || {},
    migrationMissing:
      Boolean(snapshot.courseBriefReadMigrationMissing),
    snapshot
  }
}

export function presentCandidate(candidate = {}) {
  const ref = objectRef(candidate)
  if (!ref) return null
  return {
    ...ref,
    detail:
      candidate.mainLine ||
      [candidate.date, candidate.time, candidate.place]
        .filter(Boolean)
        .join(' · '),
    read: candidate.read
  }
}
