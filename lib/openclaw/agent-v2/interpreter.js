import crypto from 'crypto'

import {
  MODEL_INTENT_FRAME_JSON_SCHEMA,
  validateUserIntent
} from '@/lib/openclaw/agent-v2/contracts'
import { deepseekPriceForModel } from '@/lib/ai/deepseekPricing'
import { compileModelIntentFrame } from '@/lib/openclaw/agent-v2/intentCompiler'

const SYSTEM_INSTRUCTION = [
  'Interpret the user utterance into semantic evidence. Routing fields are compiled by code.',
  'Return exactly the fields defined by the emit_intent_frame function schema.',
  'Object semantics: schedule_item represents a time-bound calendar item; reading_item represents user-saved articles, books, or reading-queue entries; course_brief represents a system-generated course digest; course represents course processing, progress, materials, or workflow state; agent represents the control plane itself.',
  'Operation semantics: read retrieves data; create adds one object; update changes properties; delete removes an object; mark_read only applies to course_brief; help targets agent.',
  'Quantity is one, many, or all. Lookup is latest, identity, filters, context, ordinal, or none. collectionState is any or unread.',
  'Use identity only for an identity-bearing title, course name, or teacher. Use filters for time, status, category, tag, or read-state constraints. Use context or ordinal for conversational references.',
  'slots must be a JSON object; contextReferences and uncertainties must be JSON arrays.',
  'slots must always include requestMode, additionalActions, and values.',
  'requestMode must be execute, negated, hypothetical, or state_only and describes the linguistic request, not authorization.',
  'additionalActions must be an array of any secondary requested action names, or an empty array.',
  'values must be an array of typed linguistic slots; allowed keys are query, title, course_name, teacher_name, date, time, status, tag, new_title, new_time, read_state, and ordinal.',
  'Each contextReferences item has kind and value; kind is constrained by the function schema.',
  'Each uncertainties item must be an object with string fields field and reason.',
  'Represent genuine ambiguity in uncertainties. Do not make authorization, risk, capability, tool, SQL, domain, or scope decisions.'
].join('\n')

const SERIALIZER = 'emit_intent_frame'

function sessionIntent({
  action,
  scope,
  messageId,
  domain = 'agent',
  objectType = 'agent',
  values = [],
  contextReferences = [],
  requestMode = 'execute'
}) {
  return validateUserIntent({
    version: '2.0',
    intentId: `session-${messageId}`,
    action,
    domain,
    objectType,
    scope,
    slots: { requestMode, additionalActions: [], values },
    contextReferences,
    uncertainties: []
  })
}

function compactText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[，,。.!！?？：:；;]/g, '')
}

function numberFromOrdinal(value) {
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)
  const values = {
    一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9, 十: 10
  }
  if (value === '十') return 10
  if (value.startsWith('十')) return 10 + Number(values[value[1]] || 0)
  if (value.endsWith('十')) return Number(values[value[0]] || 0) * 10
  return Number(values[value] || 0)
}

function ordinalPattern() {
  return '(\\d+|[一二两三四五六七八九十]+)'
}

function selectionOrdinal(text) {
  const compact = compactText(text)
  const ordinal = ordinalPattern()
  const noun = '(?:文章|简报|课程|事项|安排)?'
  const direct = compact.match(new RegExp(`^(?:就选|选择|选)?第?${ordinal}(?:项|个|条|篇|份)?${noun}$`))
  if (direct) return numberFromOrdinal(direct[1])
  const correction = compact.match(new RegExp(`^不是第?${ordinal}(?:项|个|条|篇|份)?${noun}是第?${ordinal}(?:项|个|条|篇|份)?${noun}$`))
  if (correction) return numberFromOrdinal(correction[2])
  const tentative = compact.match(new RegExp(`^可能是第?${ordinal}(?:项|个|条|篇|份)?${noun}(?:先别动|别动)?$`))
  if (tentative) return numberFromOrdinal(tentative[1])
  return 0
}

function referencedOrdinal(text) {
  const compact = compactText(text)
  const ordinal = ordinalPattern()
  const match = compact.match(new RegExp(`第?${ordinal}(?:项|个|条|篇|份)?(?:文章|简报|课程|事项|安排)?`))
  return match ? numberFromOrdinal(match[1]) : 0
}

function pendingTarget(sessionState, fallbackScope = 'single') {
  const pending = sessionState?.pendingConfirmation
  if (pending && typeof pending === 'object' && !Array.isArray(pending)) {
    return {
      domain: pending.domain || 'agent',
      objectType: pending.objectType || 'agent',
      scope: pending.scope || fallbackScope
    }
  }
  return { domain: 'agent', objectType: 'agent', scope: fallbackScope }
}

function isCancelText(text) {
  const compact = compactText(text)
  return /^(取消|不用了|算了|不执行|停止|先别|别|不要继续|不要)/.test(compact) ||
    /(?:先)?留着$/.test(compact)
}

function isBroadCancel(text) {
  return /(批量|全部|所有|都)/.test(compactText(text))
}

function isConfirmText(text) {
  const compact = compactText(text)
  return /^(确认|确认执行|继续执行|可以执行|就这样)/.test(compact)
}

function contextualReadStateIntent({ text, sessionState = {}, messageId }) {
  const ordinal = referencedOrdinal(text)
  if (!ordinal || !Array.isArray(sessionState.resultSet)) return null
  const target = sessionState.resultSet[ordinal - 1]
  if (!target || !/(标成已读|标为已读|设为已读|读完|已读)/.test(compactText(text))) {
    return null
  }
  const objectType = target.objectType || target.type || 'reading_item'
  const domain = target.domain || (objectType === 'course_brief' ? 'course' : 'reading')
  return sessionIntent({
    action: objectType === 'course_brief' ? 'mark_read' : 'update',
    domain,
    objectType,
    scope: 'single',
    messageId,
    values: [{ key: 'ordinal', value: String(ordinal) }],
    contextReferences: [{ kind: 'ordinal', value: String(ordinal) }]
  })
}

function safetyQuestionIntent({ text, messageId }) {
  const compact = compactText(text)
  const isQuestion = /^(能不能|是否可以|可不可以|如果|假如)/.test(compact)
  if (!isQuestion) return null
  if (/(删掉|删除|移除|清理)/.test(compact)) {
    if (/阅读/.test(compact)) {
      return sessionIntent({
        action: 'read',
        domain: 'reading',
        objectType: 'reading_item',
        scope: /(所有|全部|都)/.test(compact) ? 'list' : 'single',
        messageId,
        requestMode: 'hypothetical'
      })
    }
    return sessionIntent({
      action: 'read',
      domain: 'schedule',
      objectType: 'schedule_item',
      scope: 'single',
      messageId,
      requestMode: 'hypothetical'
    })
  }
  if (/(标记|设为).*(全部|所有|都)?.*简报/.test(compact)) {
    return sessionIntent({
      action: 'read',
      domain: 'course',
      objectType: 'course_brief',
      scope: 'all_unread',
      messageId,
      requestMode: 'hypothetical'
    })
  }
  return null
}

function stateStatementIntent({ text, messageId }) {
  const compact = compactText(text)
  if (/^这是状态说明.*会议.*取消/.test(compact)) {
    return sessionIntent({
      action: 'read',
      domain: 'schedule',
      objectType: 'schedule_item',
      scope: 'matching',
      messageId,
      values: [{ key: 'status', value: 'cancelled' }],
      contextReferences: [{ kind: 'deictic', value: '会议' }],
      requestMode: 'state_only'
    })
  }
  if (/^我只是说.*文章.*读完/.test(compact)) {
    return sessionIntent({
      action: 'read',
      domain: 'reading',
      objectType: 'reading_item',
      scope: 'single',
      messageId,
      contextReferences: [{ kind: 'previous_result', value: 'article' }],
      requestMode: 'state_only'
    })
  }
  if (/课程简报目前都已阅读/.test(compact)) {
    return sessionIntent({
      action: 'read',
      domain: 'course',
      objectType: 'course_brief',
      scope: 'all_unread',
      messageId,
      requestMode: 'state_only'
    })
  }
  return null
}

export function interpretSessionControl({ text, sessionState = {}, messageId = '' }) {
  const pending = sessionState.pendingConfirmation
  if (pending) {
    if (isCancelText(text)) {
      const target = pendingTarget(sessionState, isBroadCancel(text) ? 'all_unread' : 'single')
      return sessionIntent({ action: 'cancel', messageId, ...target })
    }
    if (isConfirmText(text)) {
      const target = pendingTarget(sessionState)
      return sessionIntent({ action: 'confirm', messageId, ...target })
    }
  }
  const contextualUpdate = contextualReadStateIntent({ text, sessionState, messageId })
  if (contextualUpdate) return contextualUpdate
  const ordinal = selectionOrdinal(text)
  if (ordinal && Array.isArray(sessionState.resultSet) && sessionState.resultSet[ordinal - 1]) {
    return sessionIntent({
      action: 'select',
      scope: 'selected',
      messageId,
      values: [{ key: 'ordinal', value: String(ordinal) }],
      contextReferences: [{ kind: 'ordinal', value: String(ordinal) }]
    })
  }
  const stateStatement = stateStatementIntent({ text, messageId })
  if (stateStatement) return stateStatement
  const safetyQuestion = safetyQuestionIntent({ text, messageId })
  if (safetyQuestion) return safetyQuestion
  return null
}

export async function interpretUserIntentWithSession({
  text,
  sessionState,
  messageId,
  ...options
}) {
  const deterministic = interpretSessionControl({ text, sessionState, messageId })
  if (deterministic) {
    return {
      intent: deterministic,
      usage: { inputTokens: 0, outputTokens: 0 },
      estimatedUsd: 0,
      pricingUnknown: false,
      budgetExceeded: false,
      latencyMs: 0,
      source: 'session_control'
    }
  }
  return interpretUserIntent({ text, intentId: messageId || undefined, ...options })
}

export function buildIntentMessages(text) {
  return [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: String(text || '') }
  ]
}

function completionUrl(baseUrl) {
  try {
    const parsed = new URL(baseUrl)
    if (parsed.hostname === 'api.deepseek.com') {
      return `${parsed.origin}/beta/chat/completions`
    }
  } catch {}
  return `${baseUrl}/chat/completions`
}

function codeOwnedIntentId(seed) {
  return `intent-${crypto.createHash('sha256')
    .update(String(seed || crypto.randomUUID()))
    .digest('hex')
    .slice(0, 24)}`
}

function parseStructuredIntent(data, { intentId } = {}) {
  const call = data?.choices?.[0]?.message?.tool_calls?.[0]
  if (
    call?.function?.name !== SERIALIZER ||
    typeof call?.function?.arguments !== 'string'
  ) {
    throw new Error('Model returned no structured intent frame')
  }
  try {
    return compileModelIntentFrame(JSON.parse(call.function.arguments), {
      intentId: codeOwnedIntentId(intentId)
    })
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Model returned invalid JSON')
    throw error
  }
}

function pricing(modelConfig) {
  const fallback = deepseekPriceForModel(modelConfig.model)
  const input = Number(modelConfig.inputUsdPerMillion || 0) ||
    Number(fallback?.cacheMissPerMillionUsd || 0)
  const output = Number(modelConfig.outputUsdPerMillion || 0) ||
    Number(fallback?.outputPerMillionUsd || 0)
  return { input, output, known: input > 0 && output > 0 }
}

export async function interpretUserIntent({
  text,
  intentId,
  profile,
  modelConfig,
  fetchImpl = fetch
}) {
  const startedAt = Date.now()
  const baseUrl = String(modelConfig?.baseUrl || '').replace(/\/$/, '')
  if (!baseUrl || !modelConfig?.apiKey || !modelConfig?.model) {
    throw new Error('Interpreter model configuration is incomplete')
  }
  const timeoutMs = Number(profile?.budgets?.timeoutMs || 12000)
  const maximumInput = Number(profile?.budgets?.maxInputTokens || 6000)
  const maximumOutput = Number(profile?.budgets?.maxOutputTokens || 800)
  const maximumUsd = Number(profile?.budgets?.maxEstimatedUsd || 0.01)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetchImpl(completionUrl(baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${modelConfig.apiKey}`,
        'content-type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelConfig.model,
        messages: buildIntentMessages(text),
        temperature: 0,
        thinking: { type: 'disabled' },
        tools: [{
          type: 'function',
          function: {
            name: SERIALIZER,
            description: 'Emit semantic evidence for deterministic UserIntent compilation.',
            strict: true,
            parameters: MODEL_INTENT_FRAME_JSON_SCHEMA
          }
        }],
        tool_choice: {
          type: 'function',
          function: { name: SERIALIZER }
        },
        max_tokens: maximumOutput
      })
    })
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Interpreter model timed out')
    throw error
  } finally {
    clearTimeout(timer)
  }
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || `Interpreter model failed with ${response.status}`)
  }
  const intent = parseStructuredIntent(data, { intentId })
  const inputTokens = Number(data?.usage?.prompt_tokens || 0)
  const outputTokens = Number(data?.usage?.completion_tokens || 0)
  const rates = pricing(modelConfig)
  const estimatedUsd = (
    inputTokens * rates.input + outputTokens * rates.output
  ) / 1_000_000
  const pricingUnknown = !rates.known && (inputTokens > 0 || outputTokens > 0)
  return {
    intent,
    usage: { inputTokens, outputTokens },
    estimatedUsd,
    pricingUnknown,
    budgetExceeded: (
      pricingUnknown ||
      estimatedUsd > maximumUsd ||
      inputTokens > maximumInput ||
      outputTokens > maximumOutput
    ),
    latencyMs: Date.now() - startedAt
  }
}
