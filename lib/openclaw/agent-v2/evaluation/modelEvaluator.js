import { validateUserIntent } from '@/lib/openclaw/agent-v2/contracts'
import { deepseekPriceForModel } from '@/lib/ai/deepseekPricing'

const SYSTEM_INSTRUCTION = [
  'You are the interpretation stage for UserIntent v2.',
  'Return exactly one JSON object with these fields:',
  'version, intentId, action, domain, objectType, scope, slots, contextReferences, uncertainties.',
  'version must be exactly "2.0"; intentId must be a non-empty identifier.',
  'Allowed domains: schedule, reading, course, agent.',
  'Domain to object type mapping: schedule -> schedule_item; reading -> reading_item; course -> course or course_brief; agent -> agent.',
  'Object semantics: schedule_item represents a time-bound calendar item; reading_item represents user-saved articles, books, or reading-queue entries; course_brief represents a system-generated course digest; course represents course processing, progress, materials, or workflow state; agent represents the control plane itself.',
  'Allowed actions: read, create, update, delete, mark_read, help, cancel, select, confirm.',
  'read retrieves existing data; create adds an object; update changes schedule or reading properties; delete removes an object; mark_read is only for course_brief; cancel, select, and confirm operate on conversation state.',
  'Allowed scopes: single, matching, all_unread, list, selected, none.',
  'Scope semantics: single means one uniquely identified target; matching is entity resolution by identity-bearing fields such as title, name, or owner and may return candidates; list means collection retrieval, including collections constrained only by time, status, or category; selected means an ordinal or contextual selection from a known result set; all_unread means an operation over the complete unread set, not merely reading an unread collection; none means no resource target.',
  'slots must be a JSON object; contextReferences and uncertainties must be JSON arrays.',
  'slots must always include requestMode and additionalActions.',
  'requestMode must be execute, negated, hypothetical, or state_only and describes the linguistic request, not authorization.',
  'additionalActions must be an array of any secondary requested action names, or an empty array.',
  'Each contextReferences item must be an object with string fields kind and value.',
  'Each uncertainties item must be an object with string fields field and reason.',
  'Represent ambiguity in uncertainties. Return JSON only.'
].join('\n')

export function buildIntentEvaluationMessages(item) {
  return [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: String(item?.input || '') }
  ]
}

function parseContent(data) {
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Model returned no JSON content')
  const trimmed = content.trim()
  let candidate = trimmed
  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    const headerEnd = trimmed.indexOf('\n')
    if (headerEnd > 2) {
      candidate = trimmed.slice(headerEnd + 1, -3).trim()
    }
  }
  try {
    return JSON.parse(candidate)
  } catch {
    throw new Error('Model returned invalid JSON')
  }
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
    additionalActions.every(action => action === 'read') &&
    (intent.action === 'read' || intent.uncertainties.length === 0) &&
    !['delete', 'confirm'].includes(intent.action)
  )
}

export async function interpretEvaluationCase({
  item,
  profile,
  modelConfig,
  fetchImpl = fetch
}) {
  const startedAt = Date.now()
  const baseUrl = String(modelConfig?.baseUrl || '').replace(/\/$/, '')
  if (!baseUrl || !modelConfig?.apiKey || !modelConfig?.model) {
    throw new Error('Evaluation model configuration is incomplete')
  }
  const timeoutMs = Number(profile?.budgets?.timeoutMs || 12000)
  const maxOutputTokens = Number(profile?.budgets?.maxOutputTokens || 800)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${modelConfig.apiKey}`,
        'content-type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelConfig.model,
        messages: buildIntentEvaluationMessages(item),
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: maxOutputTokens
      })
    })
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Evaluation model timed out')
    throw error
  } finally {
    clearTimeout(timer)
  }
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || `Evaluation model failed with ${response.status}`)
  }
  const intent = validateUserIntent(parseContent(data))
  const inputTokens = Number(data?.usage?.prompt_tokens || 0)
  const outputTokens = Number(data?.usage?.completion_tokens || 0)
  const fallbackPricing = deepseekPriceForModel(modelConfig.model)
  const configuredInputPrice = Number(modelConfig.inputUsdPerMillion || 0)
  const configuredOutputPrice = Number(modelConfig.outputUsdPerMillion || 0)
  const inputUsdPerMillion = configuredInputPrice > 0
    ? configuredInputPrice
    : Number(fallbackPricing?.cacheMissPerMillionUsd || 0)
  const outputUsdPerMillion = configuredOutputPrice > 0
    ? configuredOutputPrice
    : Number(fallbackPricing?.outputPerMillionUsd || 0)
  const pricingKnown = inputUsdPerMillion > 0 && outputUsdPerMillion > 0
  const estimatedUsd = (
    inputTokens * inputUsdPerMillion +
    outputTokens * outputUsdPerMillion
  ) / 1_000_000
  const pricingUnknown = !pricingKnown && (inputTokens > 0 || outputTokens > 0)
  const maximumUsd = Number(profile?.budgets?.maxEstimatedUsd || 0.01)
  const maximumInputTokens = Number(profile?.budgets?.maxInputTokens || 6000)
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
    inputTokens,
    outputTokens,
    estimatedUsd,
    pricingUnknown,
    budgetExceeded: (
      pricingUnknown ||
      estimatedUsd > maximumUsd ||
      inputTokens > maximumInputTokens ||
      outputTokens > maxOutputTokens
    ),
    latencyMs: Date.now() - startedAt
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
