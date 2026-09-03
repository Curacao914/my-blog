import { capabilityForPlan } from '@/lib/openclaw/agent-v2/planner'

function slots(intent) {
  return new Map((intent.slots?.values || []).map(slot => [slot.key, slot.value]))
}

function requiredInputReasons(intent) {
  const values = slots(intent)
  const reasons = []
  if (intent.action === 'create' && intent.domain === 'schedule') {
    if (!values.has('title') && !values.has('query')) reasons.push('missing_create_title')
    if (!values.has('date') && !values.has('time')) reasons.push('missing_schedule_time')
  }
  if (intent.action === 'create' && intent.domain === 'reading') {
    if (!values.has('title') && !values.has('query')) reasons.push('missing_create_title')
  }
  if (intent.action === 'update') {
    const patchKeys = ['new_title', 'new_time', 'date', 'time', 'status', 'tag', 'read_state']
    if (!patchKeys.some(key => values.has(key))) reasons.push('missing_update_patch')
  }
  return reasons
}

export function evaluateSemanticGate({
  intent,
  plan,
  resolution = null,
  sessionState = {},
  budgetExceeded = false
}) {
  const capability = capabilityForPlan(plan)
  const reasons = []
  if (!capability) reasons.push('capability_not_registered')
  if (plan?.clarification?.reason) reasons.push(plan.clarification.reason)
  if (intent.intentId !== plan.intentId) reasons.push('intent_plan_identity_mismatch')
  if (capability && (
    capability.domain !== intent.domain ||
    !capability.actions.includes(intent.action) ||
    !capability.objectTypes.includes(intent.objectType) ||
    !capability.scopes.includes(intent.scope)
  )) reasons.push('intent_capability_mismatch')
  if (intent.slots.requestMode !== 'execute') reasons.push(`request_mode_${intent.slots.requestMode}`)
  if (intent.slots.additionalActions.length) reasons.push('compound_request')
  if (intent.uncertainties.length) reasons.push('model_uncertainty')
  if (budgetExceeded) reasons.push('model_budget_exceeded')
  if (['confirm', 'cancel'].includes(intent.action) && !sessionState.pendingConfirmation) {
    reasons.push('no_pending_confirmation')
  }
  reasons.push(...requiredInputReasons(intent))
  if (plan.resolution.required && resolution?.status !== 'resolved') {
    reasons.push(`entity_${resolution?.status || 'missing'}`)
  }
  const confirmationRequired = capability?.confirmation === 'required'
  if (confirmationRequired) reasons.push('confirmation_required')
  return {
    decision: reasons.length ? 'clarify' : 'would_execute',
    executionAllowed: false,
    shadowOnly: true,
    risk: capability?.risk || 'privileged',
    confirmationRequired,
    reasons: [...new Set(reasons)]
  }
}
