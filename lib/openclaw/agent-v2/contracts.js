export const AGENT_V2_CONTRACT_VERSION = '2.0'

const ACTION_VALUES = [
  'read', 'create', 'update', 'delete', 'mark_read', 'help',
  'cancel', 'select', 'confirm'
]
const DOMAIN_VALUES = ['schedule', 'reading', 'course', 'agent']
const SCOPE_VALUES = [
  'single', 'matching', 'all_unread', 'list', 'selected', 'none'
]
const OBJECT_TYPE_VALUES = [
  'schedule_item', 'reading_item', 'course', 'course_brief', 'agent'
]
const REQUEST_MODE_VALUES = ['execute', 'negated', 'hypothetical', 'state_only']
const SLOT_KEY_VALUES = [
  'query', 'title', 'course_name', 'teacher_name', 'date', 'time',
  'status', 'tag', 'new_title', 'new_time', 'read_state', 'ordinal'
]
const ACTIONS = new Set(ACTION_VALUES)
const DOMAINS = new Set(DOMAIN_VALUES)
const SCOPES = new Set(SCOPE_VALUES)
const OBJECTS_BY_DOMAIN = {
  schedule: new Set(['schedule_item']),
  reading: new Set(['reading_item']),
  course: new Set(['course', 'course_brief']),
  agent: new Set(['agent'])
}
const RISK_LEVELS = new Set([
  'read', 'reversible_write', 'bulk_write', 'destructive', 'privileged'
])
const REQUEST_MODES = new Set(REQUEST_MODE_VALUES)
const SLOT_KEYS = new Set(SLOT_KEY_VALUES)
const FORBIDDEN_MODEL_FIELDS = new Set([
  'capability', 'capabilityId', 'tool', 'toolName', 'sql', 'query',
  'querySpec', 'mutationSpec', 'risk', 'riskLevel', 'authorization',
  'policyDecision'
])
const FORBIDDEN_SLOT_FIELDS = new Set(
  [...FORBIDDEN_MODEL_FIELDS].filter(field => field !== 'query')
)

const providerText = () => ({ type: 'string' })

export const USER_INTENT_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'version', 'intentId', 'action', 'domain', 'objectType', 'scope',
    'slots', 'contextReferences', 'uncertainties'
  ],
  properties: {
    version: { type: 'string', enum: [AGENT_V2_CONTRACT_VERSION] },
    intentId: providerText(),
    action: { type: 'string', enum: ACTION_VALUES },
    domain: { type: 'string', enum: DOMAIN_VALUES },
    objectType: { type: 'string', enum: OBJECT_TYPE_VALUES },
    scope: { type: 'string', enum: SCOPE_VALUES },
    slots: {
      type: 'object',
      additionalProperties: false,
      required: ['requestMode', 'additionalActions', 'values'],
      properties: {
        requestMode: { type: 'string', enum: REQUEST_MODE_VALUES },
        additionalActions: {
          type: 'array',
          items: { type: 'string', enum: ACTION_VALUES }
        },
        values: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['key', 'value'],
            properties: {
              key: { type: 'string', enum: SLOT_KEY_VALUES },
              value: providerText()
            }
          }
        }
      }
    },
    contextReferences: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'value'],
        properties: {
          kind: providerText(),
          value: providerText()
        }
      }
    },
    uncertainties: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'reason'],
        properties: {
          field: providerText(),
          reason: providerText()
        }
      }
    }
  }
})

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

function boundedString(value, label, maximum) {
  const output = string(value, label)
  if (output.length > maximum) throw new Error(`${label} is too long`)
  return output
}

function array(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  return value
}

function boundedArray(value, label, maximum) {
  const output = array(value, label)
  if (output.length > maximum) throw new Error(`${label} has too many items`)
  return output
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
  boundedString(value.intentId, 'intentId', 100)
  if (!ACTIONS.has(value.action)) throw new Error('action is unsupported')
  if (!DOMAINS.has(value.domain)) throw new Error('domain is unsupported')
  if (!OBJECTS_BY_DOMAIN[value.domain]?.has(value.objectType)) {
    throw new Error(`objectType is inconsistent with domain ${value.domain}`)
  }
  if (!SCOPES.has(value.scope)) throw new Error('scope is unsupported')
  object(value.slots, 'slots')
  exactKeys(
    value.slots,
    new Set(['requestMode', 'additionalActions', 'values']),
    'UserIntent.slots'
  )
  if (!REQUEST_MODES.has(value.slots.requestMode)) {
    throw new Error('UserIntent.slots.requestMode is unsupported')
  }
  boundedArray(value.slots.additionalActions, 'UserIntent.slots.additionalActions', 4)
    .forEach(action => {
      if (!ACTIONS.has(action)) {
        throw new Error('UserIntent.slots.additionalActions contains unsupported action')
      }
    })
  boundedArray(value.slots.values, 'UserIntent.slots.values', 16).forEach(slot => {
    object(slot, 'UserIntent.slots.values item')
    exactKeys(slot, new Set(['key', 'value']), 'UserIntent.slots.values item')
    if (!SLOT_KEYS.has(slot.key)) {
      const qualifier = FORBIDDEN_SLOT_FIELDS.has(slot.key) ? 'forbidden' : 'unsupported'
      throw new Error(`UserIntent.slots.values contains ${qualifier} key: ${slot.key}`)
    }
    boundedString(slot.value, 'UserIntent.slots.values value', 300)
  })
  boundedArray(value.contextReferences, 'contextReferences', 8).forEach(reference => {
    object(reference, 'contextReferences item')
    exactKeys(reference, new Set(['kind', 'value']), 'contextReferences item')
    boundedString(reference.kind, 'contextReferences kind', 80)
    boundedString(reference.value, 'contextReferences value', 240)
    rejectKeys(reference, FORBIDDEN_MODEL_FIELDS, 'UserIntent.contextReferences')
  })
  boundedArray(value.uncertainties, 'uncertainties', 8).forEach(uncertainty => {
    object(uncertainty, 'uncertainties item')
    exactKeys(uncertainty, new Set(['field', 'reason']), 'uncertainties item')
    boundedString(uncertainty.field, 'uncertainties field', 80)
    boundedString(uncertainty.reason, 'uncertainties reason', 300)
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
