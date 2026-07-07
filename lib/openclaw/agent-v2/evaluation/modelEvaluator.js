import {
  buildIntentMessages,
  interpretUserIntentWithSession
} from '@/lib/openclaw/agent-v2/interpreter'

export function buildIntentEvaluationMessages(item) {
  return buildIntentMessages(item?.input)
}

function capabilityId(intent) {
  if (intent.domain === 'course' && intent.action === 'mark_read') {
    return 'course.brief.mark_read'
  }
  return `${intent.domain}.${intent.action}`
}

function executionEligibility(profile, intent) {
  const requestMode = intent.slots?.requestMode
  const additionalActions = Array.isArray(intent.slots?.additionalActions)
    ? intent.slots.additionalActions
    : []
  return Boolean(
    profile?.capabilities?.[capabilityId(intent)] === true &&
    requestMode === 'execute' &&
    additionalActions.every(action => ['read', 'help'].includes(action)) &&
    (intent.action === 'read' || intent.uncertainties.length === 0) &&
    !['delete', 'confirm'].includes(intent.action)
  )
}

function evaluationSessionState(item = {}) {
  const expected = item.expected || {}
  if (expected.action === 'select') {
    return { resultSet: Array.from({ length: 10 }, (_, index) => ({ id: `candidate-${index + 1}` })) }
  }
  if (['cancel', 'confirm'].includes(expected.action)) {
    if (expected.domain && expected.domain !== 'agent') {
      return {
        pendingConfirmation: {
          domain: expected.domain,
          objectType: expected.objectType,
          scope: expected.scope
        }
      }
    }
    return { pendingConfirmation: true }
  }
  return {}
}

export async function interpretEvaluationCase({
  item,
  profile,
  modelConfig,
  fetchImpl = fetch
}) {
  const interpreted = await interpretUserIntentWithSession({
    text: item?.input,
    sessionState: evaluationSessionState(item),
    messageId: item?.id,
    profile,
    modelConfig,
    fetchImpl
  })
  const { intent } = interpreted
  return {
    caseId: item.id,
    expected: item.expected,
    actual: {
      version: intent.version,
      intentId: intent.intentId,
      action: intent.action,
      domain: intent.domain,
      objectType: intent.objectType,
      scope: intent.scope,
      slots: intent.slots,
      contextReferences: intent.contextReferences,
      uncertainties: intent.uncertainties,
      executionAllowed: executionEligibility(profile, intent)
    },
    modelError: null,
    inputTokens: interpreted.usage.inputTokens,
    outputTokens: interpreted.usage.outputTokens,
    estimatedUsd: interpreted.estimatedUsd,
    pricingUnknown: interpreted.pricingUnknown,
    budgetExceeded: interpreted.budgetExceeded,
    latencyMs: interpreted.latencyMs
  }
}

export async function runFixedSetEvaluation({
  cases,
  profile,
  modelConfig,
  concurrency = 4,
  fetchImpl = fetch
}) {
  const queue = [...cases]
  const results = []
  const workers = Array.from(
    { length: Math.min(Math.max(Number(concurrency) || 1, 1), 6) },
    async () => {
      while (queue.length) {
        const item = queue.shift()
        try {
          results.push(await interpretEvaluationCase({
            item,
            profile,
            modelConfig,
            fetchImpl
          }))
        } catch (error) {
          results.push({
            caseId: item.id,
            expected: item.expected,
            actual: {
              action: null,
              domain: null,
              objectType: null,
              scope: null,
              executionAllowed: false
            },
            modelError: String(error?.message || error || 'unknown model error').slice(0, 300),
            inputTokens: 0,
            outputTokens: 0,
            estimatedUsd: 0,
            pricingUnknown: false,
            budgetExceeded: false,
            latencyMs: 0
          })
        }
      }
    }
  )
  await Promise.all(workers)
  return results.sort((left, right) => left.caseId.localeCompare(right.caseId))
}
