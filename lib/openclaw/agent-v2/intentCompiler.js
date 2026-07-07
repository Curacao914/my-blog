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

function contextReferences(frame) {
  return Array.isArray(frame?.contextReferences) ? frame.contextReferences : []
}

function contextText(frame) {
  return contextReferences(frame)
    .map(reference => `${reference?.kind || ''} ${reference?.value || ''}`)
    .join(' ')
}

function hasSlot(frame, keys) {
  const wanted = Array.isArray(keys) ? new Set(keys) : new Set([keys])
  return slotValues(frame).some(slot => wanted.has(slot.key))
}

function slotText(frame, key) {
  return slotValues(frame)
    .filter(slot => slot.key === key)
    .map(slot => String(slot.value || ''))
    .join(' ')
}

function hasIdentitySlot(frame) {
  return slotValues(frame).some(slot => IDENTITY_SLOT_KEYS.has(slot.key))
}

function hasCourseSlot(frame) {
  return slotValues(frame).some(slot => COURSE_SLOT_KEYS.has(slot.key))
}

function hasContextKind(frame, kinds) {
  const wanted = new Set(Array.isArray(kinds) ? kinds : [kinds])
  return contextReferences(frame).some(reference => wanted.has(reference.kind))
}

function hasAnyUncertainty(frame) {
  return Array.isArray(frame?.uncertainties) && frame.uncertainties.length > 0
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
    frame.objectType === 'course' &&
    frame.operation === 'read' &&
    !hasReadStateSignal(frame) &&
    slotValues(frame).length === 0 &&
    ['one', 'many'].includes(frame.quantity) &&
    ['none', 'latest', 'context', 'ordinal'].includes(frame.lookup)
  ) return 'course_brief'
  if (
    frame.objectType === 'course' &&
    frame.operation === 'read' &&
    (
      uncertaintyMentions(frame, ['简报', 'brief']) ||
      contextText(frame).includes('简报')
    )
  ) return 'course_brief'
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
    objectType === 'course_brief' &&
    frame.quantity === 'one' &&
    ['latest', 'context', 'ordinal'].includes(frame.lookup) &&
    hasOnlyReadStateSignal(frame)
  ) {
    return 'read'
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
  if (
    frame.operation === 'update' &&
    additionalActions(frame).includes('delete') &&
    !hasSlot(frame, 'new_time')
  ) {
    return 'delete'
  }
  return frame.operation
}

function courseReadScope(frame) {
  const status = slotText(frame, 'status')
  const courseName = slotText(frame, 'course_name')
  if (additionalActions(frame).includes('delete')) return 'matching'
  if (additionalActions(frame).length > 0) return 'list'
  if (status) {
    if (status === 'failed' || status === '失败') return 'single'
    if (uncertaintyMentions(frame, ['最近', '最新'])) return 'single'
    if (status.includes('需要注意')) return 'matching'
    return 'list'
  }
  if (courseName.includes('自动化')) return 'list'
  return null
}

function contextAnchoredSingle(frame) {
  if (hasContextKind(frame, ['last_created', 'last_selected', 'previous_result'])) {
    return true
  }
  return hasContextKind(frame, 'deictic') && (
    !hasIdentitySlot(frame) ||
    ['hypothetical', 'negated', 'state_only'].includes(frame.slots?.requestMode)
  )
}

function scheduleDeleteScope(frame) {
  const date = slotText(frame, 'date').toLowerCase()
  if (date.includes('今晚') || date.includes('今天') || date.includes('今日') || date === 'today') {
    return 'single'
  }
  return 'matching'
}

function contextAnchoredReadingSingle(frame) {
  if (!contextAnchoredSingle(frame)) return false
  return frame.slots?.requestMode === 'negated' ||
    hasOnlyReadStateSignal(frame) ||
    hasContextKind(frame, 'last_created')
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
    hasSlot(frame, 'query')
  ) return 'list'

  if (
    action === 'delete' &&
    objectType === 'schedule_item' &&
    hasSlot(frame, 'date') &&
    hasIdentitySlot(frame)
  ) return scheduleDeleteScope(frame)

  if (action === 'read' && objectType === 'course') {
    const scope = courseReadScope(frame)
    if (scope) return scope
  }

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

  if (
    WRITE_OPERATIONS.has(action) &&
    objectType === 'schedule_item' &&
    additionalActions(frame).includes('delete') &&
    hasSlot(frame, 'new_time')
  ) return 'matching'

  if (
    action === 'update' &&
    objectType === 'reading_item' &&
    contextAnchoredReadingSingle(frame)
  ) return 'single'

  if (
    action === 'update' &&
    objectType === 'reading_item' &&
    hasAnyUncertainty(frame)
  ) return 'matching'

  if (WRITE_OPERATIONS.has(action) && contextAnchoredSingle(frame)) return 'single'

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

function sanitizeContextReferences(input) {
  if (!Array.isArray(input?.contextReferences)) return input?.contextReferences
  return input.contextReferences.filter(reference => (
    reference &&
    typeof reference === 'object' &&
    String(reference.value || '').trim()
  ))
}

function sanitizeFrameInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input
  const output = {
    ...input,
    contextReferences: sanitizeContextReferences(input)
  }
  if (output.operation === 'mark_read' && output.objectType === 'reading_item') {
    output.operation = 'update'
  }
  if (output.objectType === 'agent' && output.operation !== 'help') {
    if (output.operation === 'mark_read') {
      output.objectType = 'course_brief'
    } else if (output.operation === 'update') {
      output.objectType = 'reading_item'
    } else {
      output.objectType = 'schedule_item'
    }
  }
  if (!output.slots || typeof output.slots !== 'object') return output
  const values = Array.isArray(output.slots.values)
    ? output.slots.values.filter(slot => String(slot?.value || '').trim())
    : output.slots.values
  return { ...output, slots: { ...output.slots, values } }
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
