import { fromDbScheduleItem } from '@/lib/domain/schedule'
import {
  listCourseBriefsWithReadState
} from '@/lib/server/courseBriefReads'
import { listScheduleRows } from '@/lib/server/supabase'
import {
  validateQuerySpec,
  validateResourceDescriptor
} from '@/lib/openclaw/agent-v2/contracts'

const V = '2.0'

export const RESOURCE_REGISTRY = Object.freeze({
  'schedule.items': validateResourceDescriptor({
    version: V, id: 'schedule.items', domain: 'schedule', objectType: 'schedule_item',
    filterFields: ['query', 'title', 'date', 'time', 'status', 'tag'],
    sortFields: ['updated_at'], maximumLimit: 50
  }),
  'reading.items': validateResourceDescriptor({
    version: V, id: 'reading.items', domain: 'reading', objectType: 'reading_item',
    filterFields: ['query', 'title', 'status', 'tag'],
    sortFields: ['updated_at'], maximumLimit: 50
  }),
  'course.briefs': validateResourceDescriptor({
    version: V, id: 'course.briefs', domain: 'course', objectType: 'course_brief',
    filterFields: ['query', 'title', 'course_name', 'teacher_name', 'read_state'],
    sortFields: ['updated_at'], maximumLimit: 50
  })
})

function isReading(item = {}) {
  return item.contentType === 'reading' || item.content_type === 'reading' ||
    item.sectionKey === 'reading' || item.section_key === 'reading' || item.date === 'reading'
}

function fieldValue(item, field) {
  const fields = {
    query: [item.title, item.courseName, item.teacher].filter(Boolean).join(' '),
    title: item.title,
    course_name: item.courseName,
    teacher_name: item.teacher,
    date: item.date,
    time: item.time,
    status: item.status,
    tag: Array.isArray(item.tags) ? item.tags.join(' ') : item.tag,
    read_state: item.read ? 'read' : 'unread'
  }
  return String(fields[field] ?? '')
}

function applyFilters(items, filters) {
  return items.filter(item => filters.every(filter => {
    const actual = fieldValue(item, filter.field).normalize('NFKC').toLocaleLowerCase('zh-CN')
    const expected = String(filter.value || '').normalize('NFKC').toLocaleLowerCase('zh-CN')
    return filter.operator === 'contains'
      ? actual.includes(expected)
      : actual === expected
  }))
}

export async function executeResourceQuery({ ownerId, querySpec, adapters = {} }) {
  const spec = validateQuerySpec(querySpec)
  const descriptor = RESOURCE_REGISTRY[spec.resource]
  if (!descriptor) throw new Error('QuerySpec resource is not registered')
  if (spec.limit > descriptor.maximumLimit) throw new Error('QuerySpec limit exceeds Resource maximum')
  spec.filters.forEach(filter => {
    if (!descriptor.filterFields.includes(filter.field) || !['eq', 'contains'].includes(filter.operator)) {
      throw new Error('QuerySpec contains an unsupported filter')
    }
  })
  spec.sort.forEach(sort => {
    if (!descriptor.sortFields.includes(sort.field) || !['asc', 'desc'].includes(sort.direction)) {
      throw new Error('QuerySpec contains an unsupported sort')
    }
  })
  let items
  if (spec.resource === 'course.briefs') {
    const loader = adapters.listCourseBriefsWithReadState || listCourseBriefsWithReadState
    items = (await loader(ownerId)).entries || []
  } else {
    const loader = adapters.listScheduleRows || listScheduleRows
    const rows = (await loader(ownerId)) || []
    const mapped = rows.map(fromDbScheduleItem)
    items = mapped.filter(item => spec.resource === 'reading.items' ? isReading(item) : !isReading(item))
  }
  return applyFilters(items, spec.filters)
    .sort((left, right) => Date.parse(right.updatedAt || right.updated_at || 0) - Date.parse(left.updatedAt || left.updated_at || 0))
    .slice(0, spec.limit)
}
