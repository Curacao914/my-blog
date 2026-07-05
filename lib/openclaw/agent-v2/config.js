import crypto from 'crypto'

const TOPOLOGY = Object.freeze([
  'message', 'intent', 'planner', 'semantic_gate', 'resource',
  'risk_policy', 'tool', 'response', 'trace'
])
const FORBIDDEN_KEYS = new Set([
  'systemPrompt', 'prompt', 'freePrompt', 'sql', 'rawSql', 'code',
  'codeNodes', 'customNode', 'skipConfirmation', 'riskOverride'
])

export const DEFAULT_AGENT_PROFILE = Object.freeze({
  schemaVersion: '1.0',
  topology: TOPOLOGY,
  models: {
    interpreter: 'deepseek-v4-flash',
    responder: 'deepseek-v4-flash'
  },
  plannerMode: 'deterministic',
  capabilities: {
    'schedule.read': true,
    'schedule.create': false,
    'schedule.update': false,
    'schedule.delete': false,
    'reading.read': true,
    'reading.create': false,
    'reading.update': false,
    'reading.delete': false,
    'course.read': true,
    'course.brief.mark_read': false
  },
  thresholds: {
    autoResolveMinimum: 0.98,
    candidateGapMinimum: 0.2,
    clarificationMaximum: 0.05
  },
  aliases: { schedule: [], reading: [], course: [] },
  budgets: {
    maxModelCalls: 1,
    maxInputTokens: 6000,
    maxOutputTokens: 800,
    maxEstimatedUsd: 0.01,
    timeoutMs: 12000
  },
  riskPolicy: {
    read: { confirmation: 'none' },
    reversible_write: { confirmation: 'none' },
    bulk_write: { confirmation: 'required' },
    destructive: { confirmation: 'required' },
    privileged: { confirmation: 'required' }
  }
})

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function rejectForbidden(value, path = 'profile') {
  if (!plainObject(value)) return
  Object.entries(value).forEach(([key, nested]) => {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`${path}.${key} is forbidden`)
    rejectForbidden(nested, `${path}.${key}`)
  })
}

function merge(base, patch) {
  if (!plainObject(patch)) return patch === undefined ? base : patch
  const next = { ...(plainObject(base) ? base : {}) }
  Object.entries(patch).forEach(([key, value]) => {
    next[key] = plainObject(value) ? merge(next[key], value) : value
  })
  return next
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (!plainObject(value)) return value
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, stable(value[key])])
  )
}

export function validateAgentProfile(input) {
  if (!plainObject(input)) throw new Error('AgentProfile must be an object')
  rejectForbidden(input)
  if (JSON.stringify(input.topology) !== JSON.stringify(TOPOLOGY)) {
    throw new Error('topology is fixed and cannot be changed')
  }
  if (input.plannerMode !== 'deterministic') {
    throw new Error('plannerMode must remain deterministic')
  }
  const budgets = input.budgets || {}
  if (budgets.maxModelCalls !== 1) throw new Error('maxModelCalls must be 1')
  if (budgets.maxInputTokens > 6000 || budgets.maxInputTokens < 1) {
    throw new Error('maxInputTokens exceeds the safety ceiling')
  }
  if (budgets.maxOutputTokens > 800 || budgets.maxOutputTokens < 1) {
    throw new Error('maxOutputTokens exceeds the safety ceiling')
  }
  if (budgets.maxEstimatedUsd > 0.01 || budgets.maxEstimatedUsd <= 0) {
    throw new Error('maxEstimatedUsd exceeds the safety ceiling')
  }
  const risk = input.riskPolicy || {}
  ;['bulk_write', 'destructive', 'privileged'].forEach(level => {
    if (risk[level]?.confirmation !== 'required') {
      throw new Error(`risk confirmation for ${level} cannot be relaxed`)
    }
  })
  ;['autoResolveMinimum', 'candidateGapMinimum', 'clarificationMaximum']
    .forEach(key => {
      const value = input.thresholds?.[key]
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`threshold ${key} must be between 0 and 1`)
      }
    })
  if (input.thresholds.autoResolveMinimum < 0.98) {
    throw new Error('autoResolveMinimum cannot be lower than 0.98')
  }
  if (input.thresholds.candidateGapMinimum < 0.2) {
    throw new Error('candidateGapMinimum cannot be lower than 0.2')
  }
  if (input.thresholds.clarificationMaximum > 0.05) {
    throw new Error('clarificationMaximum cannot exceed 0.05')
  }
  Object.values(input.aliases || {}).forEach(values => {
    if (!Array.isArray(values) || values.some(value => typeof value !== 'string')) {
      throw new Error('aliases must be string arrays')
    }
  })
  return input
}

export function buildAgentProfile(patch = {}) {
  rejectForbidden(patch)
  const profile = merge(DEFAULT_AGENT_PROFILE, patch)
  validateAgentProfile(profile)
  return profile
}

export function checksumAgentProfile(profile) {
  validateAgentProfile(profile)
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stable(profile)))
    .digest('hex')
}

export function assertPublishedProfileImmutable(record, nextProfile) {
  if (record?.status !== 'published') return true
  if (record.checksum !== checksumAgentProfile(nextProfile)) {
    throw new Error('Published AgentProfile versions are immutable')
  }
  return true
}

export const FIXED_AGENT_TOPOLOGY = TOPOLOGY
