import crypto from 'crypto'

import {
  validateCapabilityCard,
  validateQuerySpec,
  validateRoutePlan
} from '@/lib/openclaw/agent-v2/contracts'

const V = '2.0'

function card(input) {
  return validateCapabilityCard({
    version: V,
    inputSchema: {},
    outputSchema: {},
    confirmation: 'none',
    idempotent: true,
    ...input
  })
}

export const CAPABILITY_REGISTRY = Object.freeze({
  'schedule.read': card({
    id: 'schedule.read', domain: 'schedule', actions: ['read'],
    objectTypes: ['schedule_item'], scopes: ['single', 'matching', 'list', 'selected'],
    resource: 'schedule.items', tool: 'none', risk: 'read'
  }),
  'schedule.create': card({
    id: 'schedule.create', domain: 'schedule', actions: ['create'],
    objectTypes: ['schedule_item'], scopes: ['single'],
    resource: 'schedule.items', tool: 'schedule.create', risk: 'reversible_write'
  }),
  'schedule.update': card({
    id: 'schedule.update', domain: 'schedule', actions: ['update'],
    objectTypes: ['schedule_item'], scopes: ['single', 'matching', 'selected'],
    resource: 'schedule.items', tool: 'schedule.update', risk: 'reversible_write'
  }),
  'schedule.delete': card({
    id: 'schedule.delete', domain: 'schedule', actions: ['delete'],
    objectTypes: ['schedule_item'], scopes: ['single', 'matching', 'selected'],
    resource: 'schedule.items', tool: 'schedule.delete', risk: 'destructive',
    confirmation: 'required'
  }),
  'reading.read': card({
    id: 'reading.read', domain: 'reading', actions: ['read'],
    objectTypes: ['reading_item'], scopes: ['single', 'matching', 'list', 'selected'],
    resource: 'reading.items', tool: 'none', risk: 'read'
  }),
  'reading.create': card({
    id: 'reading.create', domain: 'reading', actions: ['create'],
    objectTypes: ['reading_item'], scopes: ['single'],
    resource: 'reading.items', tool: 'reading.create', risk: 'reversible_write'
  }),
  'reading.update': card({
    id: 'reading.update', domain: 'reading', actions: ['update'],
    objectTypes: ['reading_item'], scopes: ['single', 'matching', 'selected'],
    resource: 'reading.items', tool: 'reading.update', risk: 'reversible_write'
  }),
  'reading.delete': card({
    id: 'reading.delete', domain: 'reading', actions: ['delete'],
    objectTypes: ['reading_item'], scopes: ['single', 'matching', 'selected'],
    resource: 'reading.items', tool: 'reading.delete', risk: 'destructive',
    confirmation: 'required'
  }),
  'course.read': card({
    id: 'course.read', domain: 'course', actions: ['read'],
    objectTypes: ['course', 'course_brief'],
    scopes: ['single', 'matching', 'list', 'selected', 'all_unread'],
    resource: 'course.briefs', tool: 'none', risk: 'read'
  }),
  'course.brief.mark_read': card({
    id: 'course.brief.mark_read', domain: 'course', actions: ['mark_read'],
    objectTypes: ['course_brief'], scopes: ['single', 'matching', 'selected', 'all_unread'],
    resource: 'course.briefs', tool: 'course.brief.mark_read', risk: 'bulk_write',
    confirmation: 'required'
  }),
  'agent.help': card({
    id: 'agent.help', domain: 'agent', actions: ['help'], objectTypes: ['agent'],
    scopes: ['none'], resource: 'agent.capabilities', tool: 'none', risk: 'read'
  }),
  'agent.cancel': card({
    id: 'agent.cancel', domain: 'agent', actions: ['cancel'], objectTypes: ['agent'],
    scopes: ['single', 'all_unread', 'none'], resource: 'agent.session', tool: 'none', risk: 'read'
  }),
  'agent.select': card({
    id: 'agent.select', domain: 'agent', actions: ['select'], objectTypes: ['agent'],
    scopes: ['selected'], resource: 'agent.session', tool: 'none', risk: 'read'
  }),
  'agent.confirm': card({
    id: 'agent.confirm', domain: 'agent', actions: ['confirm'], objectTypes: ['agent'],
    scopes: ['single', 'all_unread'], resource: 'agent.session', tool: 'none', risk: 'read'
  })
})

export function capabilityIdForIntent(intent) {
  if (intent.domain === 'course' && intent.action === 'mark_read') {
    return 'course.brief.mark_read'
  }
  return `${intent.domain}.${intent.action}`
}

function slotMap(intent) {
  return Object.fromEntries((intent.slots?.values || []).map(slot => [slot.key, slot.value]))
}

function queryFor(intent, capability) {
  if (!capability || capability.resource.startsWith('agent.')) return null
  if (intent.action === 'create' || intent.scope === 'selected') return null
  const slots = slotMap(intent)
  const allowed = new Set([
    'query', 'title', 'course_name', 'teacher_name', 'date', 'time',
    'status', 'tag', 'read_state'
  ])
  const filters = Object.entries(slots)
    .filter(([field]) => allowed.has(field))
    .map(([field, value]) => ({
      field,
      operator: ['query', 'title', 'course_name', 'teacher_name'].includes(field)
        ? 'contains'
        : 'eq',
      value
    }))
  if (intent.scope === 'all_unread') {
    filters.push({ field: 'read_state', operator: 'eq', value: 'unread' })
  }
  return validateQuerySpec({
    version: V,
    resource: capability.resource,
    filters,
    sort: [{ field: 'updated_at', direction: 'desc' }],
    limit: intent.scope === 'single' || intent.scope === 'selected' ? 10 : 50,
    cursor: null
  })
}

export function buildRoutePlan({ intent, profile }) {
  const capabilityId = capabilityIdForIntent(intent)
  const capability = CAPABILITY_REGISTRY[capabilityId] || null
  const enabled = capability && profile?.capabilities?.[capabilityId] === true
  const supported = Boolean(
    capability &&
    capability.domain === intent.domain &&
    capability.actions.includes(intent.action) &&
    capability.objectTypes.includes(intent.objectType) &&
    capability.scopes.includes(intent.scope)
  )
  const clarification = !capability
    ? { reason: 'capability_not_registered' }
    : !supported
      ? { reason: 'intent_capability_mismatch' }
      : !enabled
        ? { reason: 'capability_disabled' }
        : null
  return validateRoutePlan({
    version: V,
    planId: crypto.randomUUID(),
    intentId: intent.intentId,
    capabilityId,
    capabilityVersion: '2.0',
    querySpec: queryFor(intent, capability),
    resolution: {
      required: Boolean(
        capability && !capability.resource.startsWith('agent.') &&
        !['list', 'none', 'all_unread'].includes(intent.scope) &&
        intent.action !== 'create'
      ),
      objectType: intent.objectType,
      scope: intent.scope
    },
    steps: [
      { type: 'semantic_gate' },
      ...(capability && !capability.resource.startsWith('agent.') ? [{ type: 'resource_query' }] : []),
      { type: 'risk_policy' },
      ...(capability?.tool !== 'none' ? [{ type: 'tool_candidate', tool: capability.tool }] : [])
    ],
    clarification
  })
}

export function capabilityForPlan(plan) {
  return CAPABILITY_REGISTRY[plan?.capabilityId] || null
}
