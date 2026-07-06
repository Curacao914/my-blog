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

function scopeFor(frame) {
  if (frame.operation === 'help') return 'none'
  if (frame.operation === 'create') {
    if (frame.quantity !== 'one') {
      throw new Error('create quantity must be one')
    }
    return 'single'
  }
  if (['latest', 'context', 'ordinal'].includes(frame.lookup)) {
    if (frame.quantity !== 'one') {
      throw new Error(`${frame.lookup} lookup quantity must be one`)
    }
    return 'single'
  }
  if (frame.quantity === 'one') return 'single'
  if (
    frame.quantity === 'all' &&
    frame.objectType === 'course_brief' &&
    frame.collectionState === 'unread'
  ) return 'all_unread'
  if (frame.lookup === 'identity') return 'matching'
  return 'list'
}

function slotsFor(frame) {
  const values = [...frame.slots.values]
  if (
    frame.collectionState === 'unread' &&
    !values.some(slot => slot.key === 'read_state')
  ) values.push({ key: 'read_state', value: 'unread' })
  return { ...frame.slots, values }
}

export function compileModelIntentFrame(frameInput, { intentId } = {}) {
  const frame = validateModelIntentFrame(frameInput)
  const domain = DOMAIN_BY_OBJECT_TYPE[frame.objectType]
  if (!domain) throw new Error('ModelIntentFrame objectType has no domain mapping')
  if (!intentId || typeof intentId !== 'string') {
    throw new Error('Intent compiler requires a code-owned intentId')
  }
  return validateUserIntent({
    version: '2.0',
    intentId,
    action: frame.operation,
    domain,
    objectType: frame.objectType,
    scope: scopeFor(frame),
    slots: slotsFor(frame),
    contextReferences: frame.contextReferences,
    uncertainties: frame.uncertainties
  })
}
