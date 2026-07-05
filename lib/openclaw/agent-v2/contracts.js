export const AGENT_V2_CONTRACT_VERSION = '2.0'

const ACTIONS = new Set([
  'read', 'create', 'update', 'delete', 'mark_read', 'help',
  'cancel', 'select', 'confirm'
])
const DOMAINS = new Set(['schedule', 'reading', 'course', 'agent'])
const SCOPES = new Set([
  'single', 'matching', 'all_unread', 'list', 'selected', 'none'
])
const OBJECTS_BY_DOMAIN = {
  schedule: new Set(['schedule_item']),
  reading: new Set(['reading_item']),
  course: new Set(['course', 'course_brief']),
  agent: new Set(['agent'])
}
const RISK_LEVELS = new Set([
  'read', 'reversible_write', 'bulk_write', 'destructive', 'privileged'
])
const REQUEST_MODES = new Set(['execute', 'negated', 'hypothetical', 'state_only'])
const FORBIDDEN_MODEL_FIELDS = new Set([
  'capability', 'capabilityId', 'tool', 'toolName', 'sql', 'query',
  'querySpec', 'mutationSpec', 'risk', 'riskLevel', 'authorization',
  'policyDecision'
])
const FORBIDDEN_SLOT_FIELDS = new Set(
  [...FORBIDDEN_MODEL_FIELDS].filter(field => field !== 'query')
)

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

function string(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

function array(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function version(value) {
  if (value !== AGENT_V2_CONTRACT_VERSION) {
    throw new Error(`version must be ${AGENT_V2_CONTRACT_VERSION}`)
  }
}

function rejectKeys(value, forbidden, label) {
  if (!value || typeof value !== 'object') return
  Object.keys(value).forEach(key => {
    if (forbidden.has(key)) throw new Error(`${label} contains forbidden field: ${key}`)
    rejectKeys(value[key], forbidden, `${label}.${key}`)
  })
}

function exactKeys(value, allowed, label) {
  Object.keys(value).forEach(key => {
    if (!allowed.has(key)) throw new Error(`${label} contains unsupported field: ${key}`)
  })
}

export function validateUserIntent(input) {
  const value = object(input, 'UserIntent')
  version(value.version)
  Object.keys(value).forEach(key => {
    if (FORBIDDEN_MODEL_FIELDS.has(key)) {
      throw new Error(`UserIntent contains forbidden field: ${key}`)
    }
  })
  exactKeys(value, new Set([
    'version', 'intentId', 'action', 'domain', 'objectType', 'scope',
    'slots', 'contextReferences', 'uncertainties'
  ]), 'UserIntent')
  string(value.intentId, 'intentId')
  if (!ACTIONS.has(value.action)) throw new Error('action is unsupported')
  if (!DOMAINS.has(value.domain)) throw new Error('domain is unsupported')
  if (!OBJECTS_BY_DOMAIN[value.domain]?.has(value.objectType)) {
    throw new Error(`objectType is inconsistent with domain ${value.domain}`)
  }
  if (!SCOPES.has(value.scope)) throw new Error('scope is unsupported')
  object(value.slots, 'slots')
  Object.entries(value.slots).forEach(([key, slotValue]) => {
    if (FORBIDDEN_SLOT_FIELDS.has(key)) {
      throw new Error(`UserIntent.slots contains forbidden field: ${key}`)
    }
    if (key === 'query' && typeof slotValue !== 'string') {
      throw new Error('UserIntent.slots.query must be a string')
    }
    if (key === 'requestMode' && !REQUEST_MODES.has(slotValue)) {
      throw new Error('UserIntent.slots.requestMode is unsupported')
    }
    if (key === 'additionalActions') {
      array(slotValue, 'UserIntent.slots.additionalActions').forEach(action => {
        if (!ACTIONS.has(action)) {
          throw new Error('UserIntent.slots.additionalActions contains unsupported action')
        }
      })
    }
    rejectKeys(slotValue, FORBIDDEN_MODEL_FIELDS, `UserIntent.slots.${key}`)
  })
  array(value.contextReferences, 'contextReferences').forEach(reference => {
    object(reference, 'contextReferences item')
    exactKeys(reference, new Set(['kind', 'value']), 'contextReferences item')
    string(reference.kind, 'contextReferences kind')
    string(reference.value, 'contextReferences value')
    rejectKeys(reference, FORBIDDEN_MODEL_FIELDS, 'UserIntent.contextReferences')
  })
  array(value.uncertainties, 'uncertainties').forEach(uncertainty => {
    object(uncertainty, 'uncertainties item')
    exactKeys(uncertainty, new Set(['field', 'reason']), 'uncertainties item')
    string(uncertainty.field, 'uncertainties field')
    string(uncertainty.reason, 'uncertainties reason')
    rejectKeys(uncertainty, FORBIDDEN_MODEL_FIELDS, 'UserIntent.uncertainties')
  })
  return value
}

export function validateQuerySpec(input) {
  const value = object(input, 'QuerySpec')
  version(value.version)
  rejectKeys(value, new Set(['sql', 'rawSql', 'statement']), 'QuerySpec')
  exactKeys(value, new Set([
    'version', 'resource', 'filters', 'sort', 'limit', 'cursor'
  ]), 'QuerySpec')
  string(value.resource, 'resource')
  array(value.filters, 'filters').forEach(filter => object(filter, 'filter'))
  array(value.sort, 'sort').forEach(sort => object(sort, 'sort'))
  if (!Number.isInteger(value.limit) || value.limit < 1 || value.limit > 100) {
    throw new Error('limit must be an integer from 1 to 100')
  }
  if (value.cursor !== null && typeof value.cursor !== 'string') {
    throw new Error('cursor must be null or a string')
  }
  return value
}

export function validateMutationSpec(input) {
  const value = object(input, 'MutationSpec')
  version(value.version)
  rejectKeys(value, new Set(['sql', 'rawSql', 'statement', 'risk']), 'MutationSpec')
  exactKeys(value, new Set([
    'version', 'tool', 'targetIds', 'create', 'patch', 'expectedVersions',
    'preconditions', 'idempotencyKey', 'traceId'
  ]), 'MutationSpec')
  string(value.tool, 'tool')
  array(value.targetIds, 'targetIds').forEach(id => string(id, 'targetId'))
  if (value.create !== null) object(value.create, 'create')
  if (value.patch !== null) object(value.patch, 'patch')
  object(value.expectedVersions, 'expectedVersions')
  array(value.preconditions, 'preconditions')
  string(value.idempotencyKey, 'idempotencyKey')
  string(value.traceId, 'traceId')
  return value
}

export function validateRoutePlan(input) {
  const value = object(input, 'RoutePlan')
  version(value.version)
  exactKeys(value, new Set([
    'version', 'planId', 'intentId', 'capabilityId', 'capabilityVersion',
    'querySpec', 'resolution', 'steps', 'clarification'
  ]), 'RoutePlan')
  string(value.planId, 'planId')
  string(value.intentId, 'intentId')
  string(value.capabilityId, 'capabilityId')
  string(value.capabilityVersion, 'capabilityVersion')
  if (value.querySpec !== null) validateQuerySpec(value.querySpec)
  object(value.resolution, 'resolution')
  array(value.steps, 'steps')
  if (value.clarification !== null) object(value.clarification, 'clarification')
  return value
}

export function validateCapabilityCard(input) {
  const value = object(input, 'CapabilityCard')
  version(value.version)
  exactKeys(value, new Set([
    'version', 'id', 'domain', 'actions', 'objectTypes', 'scopes',
    'inputSchema', 'outputSchema', 'resource', 'tool', 'risk',
    'confirmation', 'idempotent'
  ]), 'CapabilityCard')
  string(value.id, 'id')
  if (!DOMAINS.has(value.domain)) throw new Error('domain is unsupported')
  array(value.actions, 'actions')
  array(value.objectTypes, 'objectTypes')
  array(value.scopes, 'scopes')
  object(value.inputSchema, 'inputSchema')
  object(value.outputSchema, 'outputSchema')
  string(value.resource, 'resource')
  string(value.tool, 'tool')
  if (!RISK_LEVELS.has(value.risk)) throw new Error('risk is unsupported')
  if (!['none', 'required'].includes(value.confirmation)) {
    throw new Error('confirmation is unsupported')
  }
  if (typeof value.idempotent !== 'boolean') throw new Error('idempotent must be boolean')
  if (['destructive', 'privileged'].includes(value.risk) && value.confirmation !== 'required') {
    throw new Error('destructive and privileged capabilities require confirmation')
  }
  return Object.freeze({ ...value })
}

export function validateSessionState(input) {
  const value = object(input, 'SessionState')
  version(value.version)
  exactKeys(value, new Set([
    'version', 'activeFocus', 'references', 'resultSet',
    'pendingConfirmation', 'configVersion'
  ]), 'SessionState')
  if (value.activeFocus !== null) object(value.activeFocus, 'activeFocus')
  array(value.references, 'references').forEach(reference => {
    object(reference, 'reference')
    string(reference.kind, 'reference.kind')
    string(reference.objectType, 'reference.objectType')
    array(reference.objectIds, 'reference.objectIds')
    string(reference.sourceMessageId, 'reference.sourceMessageId')
    if (!['tool_result', 'query_result', 'user_selection'].includes(reference.provenance)) {
      throw new Error('reference.provenance is unsupported')
    }
    if (Number.isNaN(Date.parse(reference.expiresAt))) {
      throw new Error('reference.expiresAt must be an ISO date')
    }
  })
  array(value.resultSet, 'resultSet')
  if (value.pendingConfirmation !== null) object(value.pendingConfirmation, 'pendingConfirmation')
  string(value.configVersion, 'configVersion')
  return value
}

export function validateResourceDescriptor(input) {
  const value = object(input, 'Resource')
  version(value.version)
  exactKeys(value, new Set([
    'version', 'id', 'domain', 'objectType', 'filterFields', 'sortFields',
    'maximumLimit'
  ]), 'Resource')
  string(value.id, 'Resource.id')
  if (!DOMAINS.has(value.domain)) throw new Error('Resource domain is unsupported')
  if (!OBJECTS_BY_DOMAIN[value.domain]?.has(value.objectType)) {
    throw new Error('Resource objectType is inconsistent with domain')
  }
  array(value.filterFields, 'Resource.filterFields')
    .forEach(field => string(field, 'Resource.filterField'))
  array(value.sortFields, 'Resource.sortFields')
    .forEach(field => string(field, 'Resource.sortField'))
  if (!Number.isInteger(value.maximumLimit) || value.maximumLimit < 1 || value.maximumLimit > 100) {
    throw new Error('Resource maximumLimit must be from 1 to 100')
  }
  return Object.freeze({ ...value })
}

export function validateToolDescriptor(input) {
  const value = object(input, 'Tool')
  version(value.version)
  exactKeys(value, new Set([
    'version', 'id', 'domain', 'objectType', 'createFields', 'patchFields',
    'risk', 'confirmation', 'idempotent'
  ]), 'Tool')
  string(value.id, 'Tool.id')
  if (!DOMAINS.has(value.domain)) throw new Error('Tool domain is unsupported')
  if (!OBJECTS_BY_DOMAIN[value.domain]?.has(value.objectType)) {
    throw new Error('Tool objectType is inconsistent with domain')
  }
  array(value.createFields, 'Tool.createFields')
    .forEach(field => string(field, 'Tool.createField'))
  array(value.patchFields, 'Tool.patchFields')
    .forEach(field => string(field, 'Tool.patchField'))
  if (!RISK_LEVELS.has(value.risk)) throw new Error('Tool risk is unsupported')
  if (!['none', 'required'].includes(value.confirmation)) {
    throw new Error('Tool confirmation is unsupported')
  }
  if (['bulk_write', 'destructive', 'privileged'].includes(value.risk) && value.confirmation !== 'required') {
    throw new Error('Tool risk requires confirmation')
  }
  if (typeof value.idempotent !== 'boolean') throw new Error('Tool idempotent must be boolean')
  return Object.freeze({ ...value })
}

export function validateRiskPolicy(input) {
  const value = object(input, 'RiskPolicy')
  version(value.version)
  exactKeys(value, new Set(['version', 'levels']), 'RiskPolicy')
  object(value.levels, 'RiskPolicy.levels')
  RISK_LEVELS.forEach(level => {
    const rule = object(value.levels[level], `RiskPolicy.levels.${level}`)
    exactKeys(rule, new Set(['confirmation']), `RiskPolicy.levels.${level}`)
    const required = ['bulk_write', 'destructive', 'privileged'].includes(level)
    if (rule.confirmation !== (required ? 'required' : 'none')) {
      throw new Error(`RiskPolicy confirmation for ${level} cannot be relaxed`)
    }
  })
  return Object.freeze({ ...value, levels: Object.freeze({ ...value.levels }) })
}

export function validateToolResult(input) {
  const value = object(input, 'ToolResult')
  version(value.version)
  exactKeys(value, new Set([
    'version', 'status', 'affectedIds', 'before', 'after', 'failures', 'undo'
  ]), 'ToolResult')
  if (!['succeeded', 'partially_succeeded', 'failed', 'not_executed'].includes(value.status)) {
    throw new Error('ToolResult status is unsupported')
  }
  array(value.affectedIds, 'ToolResult.affectedIds')
    .forEach(id => string(id, 'ToolResult.affectedId'))
  array(value.before, 'ToolResult.before')
  array(value.after, 'ToolResult.after')
  array(value.failures, 'ToolResult.failures')
  if (value.undo !== null) object(value.undo, 'ToolResult.undo')
  if (value.status === 'succeeded' && value.affectedIds.length && !value.after.length) {
    throw new Error('ToolResult succeeded writes require after state')
  }
  return value
}
