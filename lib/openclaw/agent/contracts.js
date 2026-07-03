export const AGENT_PROTOCOL_VERSION = 1

export const ROUTE_DECISIONS = new Set([
  'act',
  'retrieve',
  'answer',
  'clarify',
  'ignore'
])

export const AGENT_DOMAINS = new Set([
  'schedule',
  'reading',
  'course',
  'agent'
])

export const ROUTE_SCOPES = new Set([
  'single',
  'selected',
  'matching',
  'all',
  'all_unread',
  'today',
  'tomorrow',
  'week',
  'overdue'
])

export const RISK_LEVELS = new Set([
  'read',
  'reversible_write',
  'bulk_write',
  'destructive',
  'privileged'
])

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COURSE_BRIEF_ID_PATTERN = /^[0-9a-f-]{36}:[^:]+$/i

function cleanText(value, limit = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function cleanStringArray(values, limit = 20) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.map(value => cleanText(value, 240)).filter(Boolean))].slice(0, limit)
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

function compactObject(value) {
  if (Array.isArray(value)) {
    return value.map(compactObject).filter(item => item !== undefined)
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, compactObject(child)])
      .filter(([, child]) => child !== undefined)
    return Object.fromEntries(entries)
  }
  if (value === undefined || value === null || value === '') return undefined
  return value
}

export function isRealObjectId(value, type = '') {
  const id = cleanText(value, 400)
  if (!id) return false
  if (type === 'course_brief') return COURSE_BRIEF_ID_PATTERN.test(id)
  return UUID_PATTERN.test(id)
}

export function normalizeRoutePlan(input = {}) {
  const source = plainObject(input)
  const target = plainObject(source.target)
  const parameters = plainObject(source.parameters)
  const confidence = Number(source.confidence)
  return compactObject({
    version: Number(source.version) || AGENT_PROTOCOL_VERSION,
    decision: cleanText(source.decision, 32),
    domain: cleanText(source.domain, 32),
    capability: cleanText(source.capability, 120),
    operation: cleanText(source.operation, 32),
    scope: cleanText(source.scope, 32) || 'single',
    target: {
      ids: cleanStringArray(target.ids, 20),
      query: cleanText(target.query, 600),
      contextRefs: cleanStringArray(target.contextRefs, 8),
      filters: plainObject(target.filters)
    },
    parameters,
    sourcePreference: cleanText(source.sourcePreference, 32) || 'internal',
    risk: cleanText(source.risk, 32),
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : 0,
    needsRetrieval: Boolean(source.needsRetrieval)
  })
}

export function validateRoutePlan(input = {}, registry) {
  const plan = normalizeRoutePlan(input)
  const errors = []

  if (plan.version !== AGENT_PROTOCOL_VERSION) {
    errors.push('unsupported_version')
  }
  if (!ROUTE_DECISIONS.has(plan.decision)) {
    errors.push('invalid_decision')
  }
  if (!AGENT_DOMAINS.has(plan.domain)) {
    errors.push('invalid_domain')
  }
  if (!plan.capability) {
    errors.push('missing_capability')
  }
  if (!ROUTE_SCOPES.has(plan.scope)) {
    errors.push('invalid_scope')
  }
  if (plan.risk && !RISK_LEVELS.has(plan.risk)) {
    errors.push('invalid_risk')
  }
  if (registry && plan.capability && !registry.has(plan.capability)) {
    errors.push('unknown_capability')
  }

  return {
    ok: errors.length === 0,
    errors,
    plan
  }
}

export function buildQuerySpec(input = {}) {
  const source = plainObject(input)
  const filters = plainObject(source.filters)
  const sort = Array.isArray(source.sort)
    ? source.sort
        .map(item => plainObject(item))
        .filter(item => item.field)
        .slice(0, 5)
        .map(item => ({
          field: cleanText(item.field, 80),
          direction: item.direction === 'asc' ? 'asc' : 'desc'
        }))
    : []

  return compactObject({
    version: Number(source.version) || 1,
    resource: cleanText(source.resource, 80),
    filters,
    sort,
    limit: Math.min(Math.max(Number(source.limit) || 20, 1), 100),
    cursor: cleanText(source.cursor, 240)
  })
}

export function buildMutationSpec(input = {}) {
  const source = plainObject(input)
  return compactObject({
    version: Number(source.version) || 1,
    tool: cleanText(source.tool, 120),
    targetIds: cleanStringArray(source.targetIds, 100),
    patch: plainObject(source.patch),
    create: plainObject(source.create),
    preconditions: plainObject(source.preconditions),
    idempotencyKey: cleanText(source.idempotencyKey, 300),
    requestedBy: cleanText(source.requestedBy, 160),
    traceId: cleanText(source.traceId, 160)
  })
}

export function validateMutationSpec(spec = {}, card = {}) {
  const value = buildMutationSpec(spec)
  const errors = []
  if (!value.tool) errors.push('missing_tool')
  if (card.id && value.tool !== card.id) errors.push('tool_mismatch')
  if (!value.idempotencyKey) errors.push('missing_idempotency_key')
  if (card.requiresTarget && !value.targetIds?.length) {
    errors.push('missing_target_ids')
  }
  return { ok: errors.length === 0, errors, spec: value }
}

export function objectRef(candidate = {}) {
  if (!candidate?.id || !candidate?.type) return null
  return compactObject({
    id: candidate.id,
    type: candidate.type,
    title: cleanText(candidate.title, 240),
    version: candidate.version || candidate.updatedAt || candidate.fingerprint || '',
    courseName: candidate.courseName || '',
    lessonKey: candidate.lessonKey || '',
    jobId: candidate.jobId || '',
    date: candidate.date || '',
    time: candidate.time || '',
    url: candidate.url || ''
  })
}
