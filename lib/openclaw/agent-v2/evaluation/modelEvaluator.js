import { validateUserIntent } from '@/lib/openclaw/agent-v2/contracts'

const SYSTEM_INSTRUCTION = [
  'You are the interpretation stage for UserIntent v2.',
  'Return exactly one JSON object with these fields:',
  'version, intentId, action, domain, objectType, scope, slots, contextReferences, uncertainties.',
  'version must be exactly "2.0"; intentId must be a non-empty identifier.',
  'Allowed domains: schedule, reading, course, agent.',
  'Allowed object types: schedule_item, reading_item, course, course_brief, agent.',
  'Allowed actions: read, create, update, delete, mark_read, help, cancel, select, confirm.',
  'Allowed scopes: single, matching, all_unread, list, selected, none.',
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
  try {
    return JSON.parse(content)
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
  return Boolean(
    profile?.capabilities?.[capabilityId(intent)] === true &&
    intent.uncertainties.length === 0 &&
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
  const estimatedUsd = (
    inputTokens * Number(modelConfig.inputUsdPerMillion || 0) +
    outputTokens * Number(modelConfig.outputUsdPerMillion || 0)
  ) / 1_000_000
  const maximumUsd = Number(profile?.budgets?.maxEstimatedUsd || 0.01)
  const maximumInputTokens = Number(profile?.budgets?.maxInputTokens || 6000)
  return {
    caseId: item.id,
    expected: item.expected,
    actual: {
      action: intent.action,
      domain: intent.domain,
      objectType: intent.objectType,
      scope: intent.scope,
      executionAllowed: executionEligibility(profile, intent)
    },
    modelError: null,
    inputTokens,
    outputTokens,
    estimatedUsd,
    budgetExceeded: (
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
