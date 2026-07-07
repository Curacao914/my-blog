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
const WRITE_OPERATIONS = new Set(['update', 'delete', 'mark_read'])
const READ_STATE_VALUES = new Set(['read', 'unread'])

function slotValues(frame) {
  return Array.isArray(frame?.slots?.values) ? frame.slots.values : []
}

function hasSlot(frame, keys) {
  const wanted = Array.isArray(keys) ? new Set(keys) : new Set([keys])
  return slotValues(frame).some(slot => wanted.has(slot.key))
}

function hasIdentitySlot(frame) {
  return slotValues(frame).some(slot => IDENTITY_SLOT_KEYS.has(slot.key))
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

function actionFor(frame) {
  const requestMode = frame.slots?.requestMode
  if (frame.operation !== 'help' && ['hypothetical', 'state_only'].includes(requestMode)) {
    return 'read'
  }
  if (
    frame.operation === 'mark_read' &&
    Array.isArray(frame.slots?.additionalActions) &&
    frame.slots.additionalActions.includes('read')
  ) {
    return 'read'
  }
  if (frame.operation === 'mark_read' && frame.objectType === 'reading_item') {
    return 'update'
  }
  return frame.operation
}

function scopeFor(frame, action = actionFor(frame)) {
  if (action === 'help') return 'none'
  if (frame.operation === 'create') {
    if (frame.quantity !== 'one') {
      throw new Error('create quantity must be one')
    }
    return 'single'
  }
  if (['context', 'ordinal'].includes(frame.lookup)) return 'single'
  if (frame.lookup === 'latest' && frame.quantity === 'one') return 'single'

  if (hasIdentitySlot(frame)) return 'matching'
  if (
    frame.objectType === 'schedule_item' &&
    hasSlot(frame, 'time') &&
    !hasSlot(frame, 'date')
  ) return 'matching'

  if (
    frame.objectType === 'course_brief' &&
    action === 'read' &&
    hasOnlyReadStateSignal(frame)
  ) return 'all_unread'

  if (
    frame.objectType === 'course_brief' &&
    action === 'mark_read' &&
    frame.quantity === 'all' &&
    hasReadStateSignal(frame)
  ) return 'all_unread'

  if (WRITE_OPERATIONS.has(action) && frame.lookup !== 'latest') return 'matching'
  if (frame.lookup === 'identity') return 'matching'
  if (
    frame.objectType === 'course_brief' &&
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
  const domain = DOMAIN_BY_OBJECT_TYPE[frame.objectType]
  if (!domain) throw new Error('ModelIntentFrame objectType has no domain mapping')
  if (!intentId || typeof intentId !== 'string') {
    throw new Error('Intent compiler requires a code-owned intentId')
  }
  const action = actionFor(frame)
  return validateUserIntent({
    version: '2.0',
    intentId,
    action,
    domain,
    objectType: frame.objectType,
    scope: scopeFor(frame, action),
    slots: slotsFor(frame),
    contextReferences: frame.contextReferences,
    uncertainties: frame.uncertainties
  })
}
