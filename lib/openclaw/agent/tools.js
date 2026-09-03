import {
  buildMutationSpec,
  isRealObjectId,
  validateMutationSpec
} from './contracts'
import {
  fromDbScheduleItem,
  toDbScheduleItem
} from '@/lib/domain/schedule'
import {
  deleteScheduleRows,
  listScheduleRows,
  upsertScheduleRows
} from '@/lib/server/supabase'
import { syncRemindersForScheduleItems } from '@/lib/server/reminders'
import { cancelScheduleReminderDeliveries } from '@/lib/server/scheduleReminderDeliveries'
import { setCourseBriefRead } from '@/lib/server/courseBriefReads'

const PATCH_FIELDS = new Set([
  'title',
  'date',
  'time',
  'place',
  'status',
  'section',
  'sectionKey',
  'priority',
  'importance',
  'urgency',
  'summary',
  'note',
  'links',
  'tags'
])

function clean(value, limit = 4000) {
  return String(value || '').trim().slice(0, limit)
}

function validDate(value, fallback = 'none') {
  const text = clean(value, 32)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  if (['reading', 'none'].includes(text)) return text
  return fallback
}

function validTime(value) {
  const text = clean(value, 32)
  const match = text.match(/^([01]?\d|2[0-3])[:：]?([0-5]\d)?$/)
  if (!match) return ''
  return `${String(match[1]).padStart(2, '0')}:${match[2] || '00'}`
}

function safeLinks(value) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      const url =
        typeof item === 'string'
          ? item
          : item?.url || item?.href || ''
      if (!/^https?:\/\//i.test(clean(url))) return null
      return {
        title:
          typeof item === 'string'
            ? '链接'
            : clean(item.title || '链接', 160),
        url: clean(url, 2000)
      }
    })
    .filter(Boolean)
    .slice(0, 8)
}

function createItemFor(plan, type) {
  const source =
    plan.parameters?.item &&
    typeof plan.parameters.item === 'object'
      ? plan.parameters.item
      : {}
  const reading = type === 'reading'
  const url = clean(source.url, 2000)
  const links = safeLinks([
    ...(Array.isArray(source.links) ? source.links : []),
    ...(url ? [{ title: source.title || '链接', url }] : [])
  ])
  const title =
    clean(source.title, 240) ||
    (reading && links[0]?.title) ||
    ''

  if (!title) {
    const error = new Error('CREATE_TITLE_REQUIRED')
    error.status = 422
    throw error
  }

  return {
    title,
    contentType: reading ? 'reading' : 'action',
    section: reading
      ? '阅读'
      : clean(source.section, 80) || '事项',
    sectionKey: reading
      ? 'reading'
      : clean(source.sectionKey, 80) || 'action',
    tone: reading ? 'today-honey' : 'today-blue',
    date: validDate(
      source.date,
      reading ? 'reading' : 'none'
    ),
    time: validTime(source.time),
    place: clean(source.place, 240),
    priority: ['low', 'normal', 'high'].includes(source.priority)
      ? source.priority
      : 'normal',
    importance:
      source.importance === 'important'
        ? 'important'
        : 'normal',
    urgency:
      source.urgency === 'urgent'
        ? 'urgent'
        : 'not_urgent',
    status: 'active',
    links,
    children: [],
    summary: clean(source.summary, 1200),
    note: clean(source.note, 2000),
    tags: Array.isArray(source.tags)
      ? source.tags.map(item => clean(item, 80)).filter(Boolean).slice(0, 3)
      : [],
    source: 'wechat-agent'
  }
}

function safePatch(value = {}) {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {}
  const patch = {}
  for (const [key, raw] of Object.entries(source)) {
    if (!PATCH_FIELDS.has(key)) continue
    if (key === 'date') {
      patch.date = validDate(raw)
    } else if (key === 'time') {
      patch.time = validTime(raw)
    } else if (key === 'links') {
      patch.links = safeLinks(raw)
    } else if (key === 'tags') {
      patch.tags = Array.isArray(raw)
        ? raw.map(item => clean(item, 80)).filter(Boolean).slice(0, 3)
        : []
    } else if (['title', 'place', 'section', 'sectionKey', 'summary', 'note'].includes(key)) {
      patch[key] = clean(raw, key === 'note' ? 2000 : 800)
    } else if (key === 'status') {
      if (['active', 'done', 'cancelled', 'archived'].includes(raw)) {
        patch.status = raw
      }
    } else {
      patch[key] = raw
    }
  }
  return patch
}

function equalValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function applyPatch(item, patch) {
  const next = { ...item }
  for (const [key, value] of Object.entries(patch)) {
    if (!equalValue(next[key], value)) next[key] = value
  }
  return next
}

function idempotencyKeyFor(context) {
  if (context.idempotencyKey) return context.idempotencyKey
  return [
    'wechat-agent',
    context.senderId || 'unknown',
    context.messageId || context.traceId
  ].join(':')
}

async function scheduleCreate({
  ownerId,
  plan,
  card,
  context
}) {
  const item = createItemFor(
    plan,
    card.domain === 'reading' ? 'reading' : 'schedule'
  )
  const idempotencyKey = idempotencyKeyFor(context)
  const rows = await listScheduleRows(ownerId)
  const existing = (rows || [])
    .map(fromDbScheduleItem)
    .find(value => value.captureKey === idempotencyKey)
  const mutationSpec = buildMutationSpec({
    tool: card.id,
    create: item,
    preconditions: { captureKeyAbsent: true },
    idempotencyKey,
    requestedBy: context.senderId,
    traceId: context.traceId
  })
  const validated = validateMutationSpec(mutationSpec, card)
  if (!validated.ok) throw new Error(validated.errors.join(','))

  if (existing) {
    return {
      mutationSpec: validated.spec,
      status: 'duplicate',
      before: existing,
      after: existing,
      items: [existing],
      count: 0,
      created: existing
    }
  }

  const row = toDbScheduleItem(
    {
      ...item,
      captureKey: idempotencyKey,
      aiTrace: {
        agentTraceId: context.traceId,
        capability: card.id,
        captureKey: idempotencyKey
      }
    },
    ownerId
  )
  const savedRows = await upsertScheduleRows([row])
  const saved = fromDbScheduleItem(savedRows?.[0] || row)
  await syncRemindersForScheduleItems({
    ownerId,
    items: [saved]
  })
  return {
    mutationSpec: validated.spec,
    status: 'created',
    before: null,
    after: saved,
    items: [saved],
    count: 1,
    created: saved,
    undoSpec: {
      tool: `${card.domain}.delete`,
      targetIds: [saved.id]
    }
  }
}

async function scheduleUpdate({
  ownerId,
  plan,
  card,
  targets,
  context
}) {
  const values = Array.isArray(targets) ? targets : []
  if (!values.length || values.some(target =>
    !target?.id || !isRealObjectId(target.id)
  )) {
    throw new Error('INVALID_REAL_TARGET_ID')
  }
  const patch =
    card.id.endsWith('.complete')
      ? { status: 'done' }
      : card.id.endsWith('.mark_read')
        ? { status: 'done' }
        : safePatch(plan.parameters?.patch)
  if (!Object.keys(patch).length) {
    const error = new Error('EMPTY_PATCH')
    error.status = 422
    throw error
  }

  const beforeItems = values.map(target => target.item || target)
  const afterItems = beforeItems.map(item => applyPatch(item, patch))
  const changed = values
    .map((target, index) => ({
      target,
      before: beforeItems[index],
      after: afterItems[index]
    }))
    .filter(entry => !equalValue(entry.before, entry.after))
  const idempotencyKey = idempotencyKeyFor(context)
  const mutationSpec = buildMutationSpec({
    tool: card.id,
    targetIds: values.map(target => target.id),
    patch,
    preconditions: {
      ownerId,
      versions: values.map(target => ({
        id: target.id,
        version: target.version || '',
        currentStatus: (target.item || target).status || ''
      }))
    },
    idempotencyKey,
    requestedBy: context.senderId,
    traceId: context.traceId
  })
  const validated = validateMutationSpec(mutationSpec, card)
  if (!validated.ok) throw new Error(validated.errors.join(','))

  if (!changed.length) {
    const before = beforeItems.length === 1 ? beforeItems[0] : beforeItems
    const after = afterItems.length === 1 ? afterItems[0] : afterItems
    return {
      mutationSpec: validated.spec,
      status: 'no_change',
      before,
      after,
      items: afterItems,
      count: 0,
      updated: afterItems.length === 1 ? afterItems[0] : null
    }
  }

  const rows = changed.map(({ target, before, after }) =>
    toDbScheduleItem(
      {
        ...after,
        id: target.id,
        source: before.source || 'wechat-agent',
        aiTrace: {
          ...(before.aiTrace || {}),
          agentTraceId: context.traceId,
          capability: card.id
        }
      },
      ownerId
    )
  )
  const savedRows = await upsertScheduleRows(rows)
  const savedById = new Map(
    (savedRows || []).map(row => {
      const item = fromDbScheduleItem(row)
      return [item.id, item]
    })
  )
  const savedItems = changed.map(({ target, after }) =>
    savedById.get(target.id) || after
  )
  await syncRemindersForScheduleItems({
    ownerId,
    items: savedItems
  })

  const before = beforeItems.length === 1 ? beforeItems[0] : beforeItems
  const after = savedItems.length === 1 ? savedItems[0] : savedItems
  return {
    mutationSpec: validated.spec,
    status: 'updated',
    before,
    after,
    items: savedItems,
    count: savedItems.length,
    updated: savedItems.length === 1 ? savedItems[0] : null,
    undoSpec: {
      tool: card.id,
      targetIds: changed.map(({ target }) => target.id),
      patches: changed.map(({ target, before: previous }) => ({
        id: target.id,
        patch: safePatch(previous)
      }))
    }
  }
}

async function scheduleDelete({
  ownerId,
  card,
  targets,
  context
}) {
  const target = targets[0]
  if (!target?.id || !isRealObjectId(target.id)) {
    throw new Error('INVALID_REAL_TARGET_ID')
  }
  const idempotencyKey = idempotencyKeyFor(context)
  const mutationSpec = buildMutationSpec({
    tool: card.id,
    targetIds: [target.id],
    preconditions: {
      ownerId,
      version: target.version || ''
    },
    idempotencyKey,
    requestedBy: context.senderId,
    traceId: context.traceId
  })
  const validated = validateMutationSpec(mutationSpec, card)
  if (!validated.ok) throw new Error(validated.errors.join(','))

  await cancelScheduleReminderDeliveries({
    ownerId,
    itemIds: [target.id]
  })
  await deleteScheduleRows(ownerId, [target.id])
  return {
    mutationSpec: validated.spec,
    status: 'deleted',
    before: target.item || target,
    after: null,
    items: [],
    count: 1
  }
}

async function courseMarkRead({
  ownerId,
  card,
  targets,
  context
}) {
  const targetIds = targets.map(item => item.id)
  if (
    targetIds.some(id => !isRealObjectId(id, 'course_brief'))
  ) {
    throw new Error('INVALID_REAL_COURSE_BRIEF_ID')
  }
  const idempotencyKey = idempotencyKeyFor(context)
  const mutationSpec = buildMutationSpec({
    tool: card.id,
    targetIds,
    patch: { read: true },
    preconditions: { read: false },
    idempotencyKey,
    requestedBy: context.senderId,
    traceId: context.traceId
  })
  const validated = validateMutationSpec(mutationSpec, card)
  if (!validated.ok) throw new Error(validated.errors.join(','))

  const before = targets.map(item => ({
    id: item.id,
    read: Boolean(item.read),
    readAt: item.readAt || '',
    fingerprint: item.fingerprint || ''
  }))
  const successes = []
  const failures = []
  for (const target of targets) {
    if (target.read) {
      successes.push(target)
      continue
    }
    try {
      const updated = await setCourseBriefRead({
        ownerId,
        jobId: target.jobId,
        lessonKey: target.lessonKey,
        read: true
      })
      successes.push({
        ...target,
        ...updated,
        type: 'course_brief'
      })
    } catch (error) {
      failures.push({
        id: target.id,
        title: target.title,
        error:
          error instanceof Error
            ? error.message
            : 'COURSE_BRIEF_UPDATE_FAILED'
      })
    }
  }

  return {
    mutationSpec: validated.spec,
    status:
      failures.length
        ? successes.length
          ? 'partial'
          : 'failed'
        : 'updated',
    before,
    after: successes.map(item => ({
      id: item.id,
      read: true,
      readAt: item.readAt || ''
    })),
    items: successes,
    failures,
    count: successes.filter(item =>
      !before.find(previous => previous.id === item.id)?.read
    ).length,
    updated: successes.length === 1 ? successes[0] : null,
    undoSpec: {
      tool: 'course.brief.mark_unread',
      targetIds: successes
        .filter(item =>
          !before.find(previous => previous.id === item.id)?.read
        )
        .map(item => item.id)
    }
  }
}

export async function executeTool({
  ownerId,
  plan,
  card,
  targets = [],
  context = {}
} = {}) {
  if (card.id === 'schedule.create' || card.id === 'reading.create') {
    return scheduleCreate({
      ownerId,
      plan,
      card,
      context
    })
  }
  if (
    [
      'schedule.update',
      'schedule.complete',
      'reading.mark_read'
    ].includes(card.id)
  ) {
    return scheduleUpdate({
      ownerId,
      plan,
      card,
      targets,
      context
    })
  }
  if (
    ['schedule.delete', 'reading.delete'].includes(card.id)
  ) {
    return scheduleDelete({
      ownerId,
      card,
      targets,
      context
    })
  }
  if (card.id === 'course.brief.mark_read') {
    return courseMarkRead({
      ownerId,
      card,
      targets,
      context
    })
  }
  throw new Error(`UNSUPPORTED_TOOL:${card.id}`)
}
