import { waitUntil } from '@vercel/functions'

import { resolveEntities } from '@/lib/openclaw/agent-v2/entityResolver'
import { interpretUserIntentWithSession } from '@/lib/openclaw/agent-v2/interpreter'
import { buildRoutePlan } from '@/lib/openclaw/agent-v2/planner'
import { executeResourceQuery } from '@/lib/openclaw/agent-v2/resources'
import { evaluateSemanticGate } from '@/lib/openclaw/agent-v2/semanticGate'
import { listAgentConfigs } from '@/lib/server/openclawAgentConfigs'
import { saveOpenClawAgentShadowTrace } from '@/lib/server/openclawAgentShadowTraces'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

export function openClawAgentV2ShadowEnabled() {
  return ['true', '1'].includes(
    String(process.env.OPENCLAW_AGENT_V2_SHADOW_ENABLED || '').trim().toLowerCase()
  )
}

function publishedConfig(configs) {
  return (configs || []).find(config => config.status === 'published') || null
}

function modelConfiguration(ai, profile) {
  return {
    apiKey: ai.apiKey,
    baseUrl: ai.baseUrl,
    model: profile.models.interpreter || ai.models?.router || ai.models?.default,
    inputUsdPerMillion: Number(ai.pricing?.inputPricePerMillion || 0),
    outputUsdPerMillion: Number(ai.pricing?.outputPricePerMillion || 0)
  }
}

function summary(items = []) {
  return items.slice(0, 5).map(item => ({
    id: item.id || null,
    type: item.type || item.contentType || null,
    title: String(item.title || '').slice(0, 160),
    updatedAt: item.updatedAt || item.updated_at || null
  }))
}

function compareLegacy(legacy, intent, plan, gate) {
  const legacyAction = String(legacy?.action || '')
  return {
    legacyAction,
    intentAction: intent.action,
    capabilityId: plan.capabilityId,
    actionMatches: Boolean(legacyAction && (
      legacyAction === intent.action ||
      (legacyAction === 'query' && intent.action === 'read') ||
      (legacyAction === 'deleted' && intent.action === 'delete')
    )),
    shadowDecision: gate.decision,
    legacySucceeded: Boolean(legacy?.ok)
  }
}

export async function runOpenClawAgentV2Shadow({
  ownerId,
  profile,
  channel = 'openclaw-weixin',
  senderId,
  threadId,
  messageId,
  message,
  legacyPayload,
  sessionState = {},
  dependencies = {}
}) {
  const environment = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview'
  const listConfigs = dependencies.listAgentConfigs || listAgentConfigs
  const configs = await listConfigs({ ownerId, environment })
  const config = publishedConfig(configs)
  if (!config) return { status: 'skipped', reason: 'no_published_config' }

  const startedAt = Date.now()
  let partial = {}
  let stage = 'model'
  try {
    const ai = await (dependencies.resolveUserAiConfig || resolveUserAiConfig)(profile)
    const interpreted = await (dependencies.interpretUserIntent || interpretUserIntentWithSession)({
      text: message,
      sessionState,
      messageId,
      profile: config.profile,
      modelConfig: modelConfiguration(ai, config.profile),
      fetchImpl: dependencies.fetchImpl || fetch
    })
    partial.interpreted = interpreted
    stage = 'planner'
    const plan = buildRoutePlan({ intent: interpreted.intent, profile: config.profile })
    partial.plan = plan
    stage = 'resource'
    const candidates = plan.querySpec
      ? await (dependencies.executeResourceQuery || executeResourceQuery)({
          ownerId,
          querySpec: plan.querySpec,
          adapters: dependencies.resourceAdapters || {}
        })
      : []
    partial.candidates = candidates
    stage = 'entity_resolution'
    const resolution = resolveEntities({
      intent: interpreted.intent,
      candidates,
      sessionState,
      thresholds: config.profile.thresholds
    })
    partial.resolution = resolution
    stage = 'semantic_gate'
    const gate = evaluateSemanticGate({
      intent: interpreted.intent,
      plan,
      resolution,
      sessionState,
      budgetExceeded: interpreted.budgetExceeded
    })
    partial.gate = gate
    stage = 'trace'
    await (dependencies.saveTrace || saveOpenClawAgentShadowTrace)({
      ownerId, channel, senderId, threadId, messageId,
      configId: config.id,
      configVersion: config.version_number,
      message,
      legacyReply: legacyPayload?.replyText || '',
      intent: interpreted.intent,
      plan,
      resolution,
      gate,
      candidateSummary: summary(candidates),
      differences: compareLegacy(legacyPayload, interpreted.intent, plan, gate),
      usage: interpreted.usage,
      model: config.profile.models.interpreter,
      estimatedUsd: interpreted.estimatedUsd,
      latencyMs: Date.now() - startedAt
    })
    return { status: 'recorded', configId: config.id, gate }
  } catch (error) {
    try {
      await (dependencies.saveTrace || saveOpenClawAgentShadowTrace)({
        ownerId, channel, senderId, threadId, messageId,
        configId: config.id,
        configVersion: config.version_number,
        message,
        legacyReply: legacyPayload?.replyText || '',
        intent: partial.interpreted?.intent || null,
        plan: partial.plan || null,
        resolution: partial.resolution || null,
        gate: partial.gate || null,
        candidateSummary: summary(partial.candidates),
        differences: {},
        usage: partial.interpreted?.usage || {},
        model: config.profile.models.interpreter,
        estimatedUsd: partial.interpreted?.estimatedUsd || 0,
        latencyMs: Date.now() - startedAt,
        errorCategory: /timed out/i.test(String(error?.message || ''))
          ? 'model_timeout'
          : `${stage}_failure`,
        errorDetail: String(error?.message || error).slice(0, 300)
      })
    } catch {}
    return { status: 'failed', error: String(error?.message || error).slice(0, 300) }
  }
}

export function attachOpenClawAgentV2Shadow({
  req,
  res,
  context,
  schedule = waitUntil,
  runner = runOpenClawAgentV2Shadow
}) {
  if (!openClawAgentV2ShadowEnabled() || !context?.messageId) return false
  const originalJson = res.json.bind(res)
  let scheduled = false
  res.json = payload => {
    if (!scheduled) {
      scheduled = true
      const task = Promise.resolve().then(() => runner({
        ...context,
        message: context.message,
        legacyPayload: payload
      })).catch(() => null)
      try {
        schedule(task)
      } catch {
        void task
      }
    }
    return originalJson(payload)
  }
  return true
}
