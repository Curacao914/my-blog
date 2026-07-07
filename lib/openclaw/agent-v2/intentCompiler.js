import {
  validateModelIntentFrame,
  validateUserIntent
} from '@/lib/openclaw/agent-v2/contracts'

const DOMAIN_BY_OBJECT_TYPE = Object.freeze({
  schedule_item: 'schedule',
  reading_item: 'reading',
  course: 'course',
  course_brief: 'course',
  agent: 'agent'
})

const IDENTITY_SLOT_KEYS = new Set([
  'title', 'query', 'course_name', 'teacher_name'
])
const COURSE_SLOT_KEYS = new Set(['course_name', 'teacher_name'])
const WRITE_OPERATIONS = new Set(['update', 'delete', 'mark_read'])
const READ_STATE_VALUES = new Set(['read', 'unread'])

function slotValues(frame) {
  return Array.isArray(frame?.slots?.values) ? frame.slots.values : []
}

function additionalActions(frame) {
  return Array.isArray(frame?.slots?.additionalActions)
    ? frame.slots.additionalActions
    : []
}

function hasSlot(frame, keys) {
  const wanted = Array.isArray(keys) ? new Set(keys) : new Set([keys])
  return slotValues(frame).some(slot => wanted.has(slot.key))
}

function hasIdentitySlot(frame) {
  return slotValues(frame).some(slot => IDENTITY_SLOT_KEYS.has(slot.key))
}

function hasCourseSlot(frame) {
  return slotValues(frame).some(slot => COURSE_SLOT_KEYS.has(slot.key))
}

function uncertaintyText(frame) {
  return Array.isArray(frame?.uncertainties)
    ? frame.uncertainties
      .map(item => `${item?.field || ''} ${item?.reason || ''}`)
      .join(' ')
    : ''
}

function uncertaintyMentions(frame, patterns) {
  const text = uncertaintyText(frame)
  return patterns.some(pattern => text.includes(pattern))
}

function hasReadStateSignal(frame) {
  if (frame.collectionState === 'unread') return true
  return slotValues(frame).some(slot => (
    slot.key === 'read_state' && READ_STATE_VALUES.has(String(slot.value || '').toLowerCase())
  ))
}

function hasOnlyReadStateSignal(frame) {
  const values = slotValues(frame)
  return hasReadStateSignal(frame) &&
    values.every(slot => slot.key === 'read_state')
}

function looksLikeReadingMarkRead(frame) {
  if (frame.operation !== 'mark_read' || frame.objectType !== 'course_brief') return false
  if (hasCourseSlot(frame) || hasSlot(frame, 'read_state')) return false
  return hasSlot(frame, 'title') ||
    uncertaintyMentions(frame, ['reading_item', '文章', '阅读'])
}

function objectTypeFor(frame) {
  if (looksLikeReadingMarkRead(frame)) return 'reading_item'
  if (
    frame.objectType === 'course_brief' &&
    frame.operation === 'read' &&
    !hasReadStateSignal(frame) &&
    hasSlot(frame, 'date')
  ) return 'course'
  return frame.objectType
}

function actionFor(frame, objectType = objectTypeFor(frame)) {
  const requestMode = frame.slots?.requestMode
  if (frame.operation === 'help') return 'help'
  if (frame.operation === 'mark_read' && objectType === 'reading_item') {
    return 'update'
  }
  if (
    frame.operation === 'mark_read' &&
    additionalActions(frame).includes('read')
  ) {
    return 'read'
  }
  if (
    requestMode === 'hypothetical' &&
    ['delete', 'mark_read'].includes(frame.operation)
  ) {
    return 'read'
  }
  if (requestMode === 'state_only' && frame.operation !== 'update') {
    return 'read'
  }
  if (frame.operation === 'update' && additionalActions(frame).includes('delete')) {
    return 'delete'
  }
  return frame.operation
}

function scopeFor(frame, action = actionFor(frame), objectType = objectTypeFor(frame)) {
  if (action === 'help') return 'none'
  if (frame.operation === 'create') {
    if (frame.quantity !== 'one') {
      throw new Error('create quantity must be one')
    }
    return 'single'
  }

  if (
    action === 'read' &&
    objectType === 'schedule_item' &&
    hasSlot(frame, 'date') &&
    hasSlot(frame, 'query') &&
    uncertaintyMentions(frame, ['query', '标题关键词', '指代'])
  ) return 'list'

  if (
    action === 'read' &&
    objectType === 'course' &&
    (hasSlot(frame, 'status') || additionalActions(frame).length > 0)
  ) return 'matching'

  if (objectType === 'course_brief' && action === 'mark_read') {
    if (hasIdentitySlot(frame)) return 'matching'
    if (frame.quantity === 'all') return 'all_unread'
    if (['latest', 'context', 'ordinal'].includes(frame.lookup)) return 'single'
    return 'matching'
  }

  if (frame.lookup === 'ordinal') return 'single'

  if (
    frame.slots?.requestMode === 'state_only' &&
    hasSlot(frame, 'status')
  ) return 'matching'

  if (frame.lookup === 'context') {
    if (
      WRITE_OPERATIONS.has(action) &&
      (
        hasIdentitySlot(frame) ||
        hasSlot(frame, 'status') ||
        slotValues(frame).length === 0 ||
        uncertaintyMentions(frame, ['identity', 'lookup', 'target', '指代'])
      )
    ) return 'matching'
    return 'single'
  }

  if (frame.lookup === 'latest' && frame.quantity === 'one') return 'single'
  if (hasIdentitySlot(frame)) return 'matching'
  if (
    objectType === 'schedule_item' &&
    hasSlot(frame, 'time') &&
    !hasSlot(frame, 'date')
  ) return 'matching'

  if (
    objectType === 'course_brief' &&
    action === 'read' &&
    hasOnlyReadStateSignal(frame)
  ) return 'all_unread'

  if (WRITE_OPERATIONS.has(action) && frame.lookup !== 'latest') return 'matching'
  if (frame.lookup === 'identity') return 'matching'
  if (
    objectType === 'course_brief' &&
    action === 'read' &&
    slotValues(frame).length === 0
  ) return 'single'
  if (frame.quantity === 'one') return 'single'
  return 'list'
}

function slotsFor(frame) {
  const values = slotValues(frame).filter(slot => String(slot.value || '').trim())
  if (
    frame.collectionState === 'unread' &&
    !values.some(slot => slot.key === 'read_state')
  ) values.push({ key: 'read_state', value: 'unread' })
  return { ...frame.slots, values }
}

function sanitizeFrameInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input
  if (!input.slots || typeof input.slots !== 'object') return input
  const values = Array.isArray(input.slots.values)
    ? input.slots.values.filter(slot => String(slot?.value || '').trim())
    : input.slots.values
  return { ...input, slots: { ...input.slots, values } }
}

export function compileModelIntentFrame(frameInput, { intentId } = {}) {
  const frame = validateModelIntentFrame(sanitizeFrameInput(frameInput))
  const objectType = objectTypeFor(frame)
  const domain = DOMAIN_BY_OBJECT_TYPE[objectType]
  if (!domain) throw new Error('ModelIntentFrame objectType has no domain mapping')
  if (!intentId || typeof intentId !== 'string') {
    throw new Error('Intent compiler requires a code-owned intentId')
  }
  const action = actionFor(frame, objectType)
  return validateUserIntent({
    version: '2.0',
    intentId,
    action,
    domain,
    objectType,
    scope: scopeFor(frame, action, objectType),
    slots: slotsFor(frame),
    contextReferences: frame.contextReferences,
    uncertainties: frame.uncertainties
  })
}
