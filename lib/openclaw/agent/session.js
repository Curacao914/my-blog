import { objectRef } from './contracts'

export const AGENT_SESSION_TTL_MS = 2 * 60 * 60 * 1000
const MAX_RESULT_SET = 12
const MAX_TURNS = 10
const MAX_TRACES = 12

function list(value, limit) {
  return Array.isArray(value) ? value.filter(Boolean).slice(-limit) : []
}

export function normalizeAgentSession(input = {}) {
  const state = input && typeof input === 'object' ? input : {}
  return {
    version: 1,
    activeTopic: state.activeTopic || null,
    lastSelectedObject:
      state.lastSelectedObject || state.lastObject || null,
    lastCreatedObject:
      state.lastCreatedObject ||
      (state.lastMutationObject?.action === 'created'
        ? state.lastMutationObject
        : null),
    lastUpdatedObject:
      state.lastUpdatedObject || state.lastMutationObject || null,
    lastResultSet: list(
      state.lastResultSet || state.candidates,
      MAX_RESULT_SET
    ),
    pendingPlan: state.pendingPlan || null,
    pendingConfirmation:
      state.pendingConfirmation || state.pendingAction || null,
    resolvedReferences:
      state.resolvedReferences &&
      typeof state.resolvedReferences === 'object'
        ? state.resolvedReferences
        : {},
    recentTurns: list(state.recentTurns, MAX_TURNS),
    recentTraces: list(state.recentTraces, MAX_TRACES),
    lastMessageId: state.lastMessageId || '',
    updatedAt: state.updatedAt || ''
  }
}

export function compactSessionForRouter(input = {}) {
  const state = normalizeAgentSession(input)
  return {
    activeTopic: state.activeTopic,
    lastSelectedObject: objectRef(state.lastSelectedObject),
    lastCreatedObject: objectRef(state.lastCreatedObject),
    lastUpdatedObject: objectRef(state.lastUpdatedObject),
    lastResultSet: state.lastResultSet.map(objectRef).filter(Boolean),
    pendingConfirmation: state.pendingConfirmation
      ? {
          capability: state.pendingConfirmation.plan?.capability || '',
          targetTitles:
            state.pendingConfirmation.targets?.map(item => item.title) || [],
          expiresAt: state.pendingConfirmation.expiresAt || ''
        }
      : null,
    recentTurns: state.recentTurns.slice(-6).map(turn => ({
      role: turn.role,
      text: String(turn.text || '').slice(0, 400)
    }))
  }
}

export function contextCandidates(stateInput = {}, refs = []) {
  const state = normalizeAgentSession(stateInput)
  const requested = new Set(Array.isArray(refs) ? refs : [])
  const entries = [
    ['lastSelected', state.lastSelectedObject],
    ['lastCreated', state.lastCreatedObject],
    ['lastUpdated', state.lastUpdatedObject],
    ['activeTopic', state.activeTopic]
  ]

  const values = entries
    .filter(([key, value]) => value && (!requested.size || requested.has(key)))
    .map(([, value]) => value)

  if (requested.has('lastResultSet')) {
    values.push(...state.lastResultSet)
  }

  return values.filter(Boolean)
}

function turn(role, text, at = new Date().toISOString()) {
  return {
    role,
    text: String(text || '').trim().slice(0, 1200),
    at
  }
}

export function updateSessionAfterResult(stateInput = {}, {
  messageId = '',
  inputText = '',
  replyText = '',
  plan = null,
  candidates = [],
  selected = null,
  created = null,
  updated = null,
  pendingPlan,
  pendingConfirmation,
  trace = null,
  now = new Date()
} = {}) {
  const state = normalizeAgentSession(stateInput)
  const timestamp = now.toISOString()

  const next = {
    ...state,
    lastMessageId: messageId || state.lastMessageId,
    activeTopic:
      selected || updated || created || state.activeTopic || null,
    lastSelectedObject: selected || state.lastSelectedObject || null,
    lastCreatedObject: created || state.lastCreatedObject || null,
    lastUpdatedObject: updated || state.lastUpdatedObject || null,
    lastResultSet: Array.isArray(candidates)
      ? candidates.slice(0, MAX_RESULT_SET)
      : state.lastResultSet,
    pendingPlan:
      pendingPlan === undefined ? state.pendingPlan : pendingPlan,
    pendingConfirmation:
      pendingConfirmation === undefined
        ? state.pendingConfirmation
        : pendingConfirmation,
    recentTurns: [
      ...state.recentTurns,
      turn('user', inputText, timestamp),
      turn('assistant', replyText, timestamp)
    ].slice(-MAX_TURNS),
    recentTraces: trace
      ? [...state.recentTraces, trace].slice(-MAX_TRACES)
      : state.recentTraces,
    updatedAt: timestamp
  }

  if (plan?.domain) {
    next.resolvedReferences = {
      ...state.resolvedReferences,
      [plan.domain]:
        objectRef(selected || updated || created) ||
        state.resolvedReferences?.[plan.domain] ||
        null
    }
  }

  return next
}

export function clearPending(stateInput = {}) {
  const state = normalizeAgentSession(stateInput)
  return {
    ...state,
    pendingPlan: null,
    pendingConfirmation: null
  }
}
