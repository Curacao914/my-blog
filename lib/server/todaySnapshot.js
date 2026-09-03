import { fromDbScheduleItem } from '@/lib/domain/schedule'
import {
  buildDailyDigestSections,
  REMINDER_TIME_ZONE
} from '@/lib/domain/reminderDigest'
import { listCourseBriefsWithReadState } from '@/lib/server/courseBriefReads'
import { listScheduleRows } from '@/lib/server/supabase'

function active(item = {}) {
  return !['done', 'cancelled', 'archived'].includes(item.status)
}

function reading(item = {}) {
  return item.contentType === 'reading' ||
    item.content_type === 'reading' ||
    item.sectionKey === 'reading' ||
    item.section_key === 'reading' ||
    item.date === 'reading'
}

function readingSort(left, right) {
  return Date.parse(right.updatedAt || right.updated_at || 0) -
    Date.parse(left.updatedAt || left.updated_at || 0)
}

export function buildTodaySnapshot({
  items = [],
  courseBriefs = [],
  now = new Date(),
  timezone = REMINDER_TIME_ZONE,
  courseBriefReadMigrationMissing = false
} = {}) {
  const sections = buildDailyDigestSections(items, now, timezone)
  const allReading = items
    .filter(item => active(item) && reading(item))
    .sort(readingSort)
  const unreadCourseBriefs = (courseBriefs || [])
    .filter(item => !item.read)
    .sort((left, right) =>
      Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0)
    )
  const pending = [
    ...sections.overdue,
    ...sections.today,
    ...sections.tomorrow,
    ...sections.upcoming
  ]

  return {
    ...sections,
    allReading,
    courseBriefs,
    unreadCourseBriefs,
    pending,
    counts: {
      overdue: sections.overdue.length,
      today: sections.today.length,
      tomorrow: sections.tomorrow.length,
      upcoming: sections.upcoming.length,
      pending: pending.length,
      reading: allReading.length,
      unreadCourseBriefs: unreadCourseBriefs.length
    },
    courseBriefReadMigrationMissing
  }
}

export async function loadTodaySnapshot({
  ownerId,
  now = new Date(),
  timezone = REMINDER_TIME_ZONE
} = {}) {
  if (!ownerId) throw new Error('ownerId is required')
  const [scheduleRows, briefState] = await Promise.all([
    listScheduleRows(ownerId),
    listCourseBriefsWithReadState(ownerId)
  ])
  return buildTodaySnapshot({
    items: (scheduleRows || []).map(fromDbScheduleItem),
    courseBriefs: briefState.entries,
    now,
    timezone,
    courseBriefReadMigrationMissing: briefState.migrationMissing
  })
}
