import crypto from 'crypto'
import { resolveEntities } from '@/lib/openclaw/agent-v2/entityResolver'
import { interpretUserIntentWithSession } from '@/lib/openclaw/agent-v2/interpreter'
import { buildRoutePlan } from '@/lib/openclaw/agent-v2/planner'
import { evaluateSemanticGate } from '@/lib/openclaw/agent-v2/semanticGate'
import { executeResourceQuery } from '@/lib/openclaw/agent-v2/resources/index'
import { listAgentConfigs } from '@/lib/server/openclawAgentConfigs'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

const MAX_COMMAND_LENGTH = 2000

function errorWithStatus(message, status = 400, code = 'BAD_REQUEST') {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function normalizeEnvironment(value) {
  return value === 'production' ? 'production' : 'preview'
}

function latestPublishedConfig(configs = []) {
  return (configs || []).find(config => config.status === 'published') || null
}

function modelConfiguration(ai = {}, profile = {}) {
  return {
    apiKey: ai.apiKey,
    baseUrl: String(ai.baseUrl || '').replace(/\/$/, ''),
    model: profile.models?.interpreter || ai.models?.router || ai.models?.default || '',
    inputUsdPerMillion: Number(ai.pricing?.inputPricePerMillion || 0),
    outputUsdPerMillion: Number(ai.pricing?.outputPricePerMillion || 0)
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function summarizeCandidate(item = {}) {
  if (!item || typeof item !== 'object') return null
  return {
    id: item.id || null,
    type: item.type || item.contentType || item.content_type || null,
    objectType: item.objectType || item.object_type || null,
    title: String(item.title || item.name || '').slice(0, 180),
    courseName: item.courseName || item.course_name || null,
    teacher: item.teacher || item.teacherName || item.teacher_name || null,
    date: item.date || null,
    time: item.time || null,
    status: item.status || null,
    updatedAt: item.updatedAt || item.updated_at || null
  }
}

function safeResolution(resolution = {}) {
  return {
    status: resolution.status || 'missing',
    score: Number(resolution.score || 0),
    gap: Number(resolution.gap || 0),
    provenance: resolution.provenance || '',
    selected: summarizeCandidate(resolution.selected),
    candidates: asArray(resolution.candidates).map(summarizeCandidate).filter(Boolean).slice(0, 8)
  }
}

function safeQuerySpec(spec) {
  if (!spec) return null
  return {
    version: spec.version,
    resource: spec.resource,
    filters: asArray(spec.filters),
    sort: asArray(spec.sort),
    limit: spec.limit,
    cursor: spec.cursor || null
  }
}

function destinationFor(intent = {}) {
  const table = {
    schedule: {
      label: 'Today / 事项',
      href: '/desk/today',
      description: '日程、提醒、今日行动和任务化安排。'
    },
    reading: {
      label: '阅读箱',
      href: '/desk/reading',
      description: '待读文章、材料、摘录和阅读状态。'
    },
    course: {
      label: '课程整理',
      href: '/desk/courses',
      description: '课程简报、课程材料、课堂笔记和课程处理流程。'
    },
    agent: {
      label: 'Agent 控制台',
      href: '/desk/agent',
      description: '确认、取消、选择、帮助和 Agent 会话控制。'
    }
  }
  return table[intent.domain] || {
    label: '待整理箱',
    href: '/desk/inbox',
    description: '暂时无法确定分类时，建议先进入待整理区域。'
  }
}

export function summarizeCommandPreview({ intent, plan, gate, resolution, candidates = [] }) {
  return {
    domain: intent.domain,
    action: intent.action,
    objectType: intent.objectType,
    scope: intent.scope,
    capabilityId: plan.capabilityId,
    gateDecision: gate.decision,
    risk: gate.risk,
    confirmationRequired: Boolean(gate.confirmationRequired),
    reasons: asArray(gate.reasons),
    candidateCount: candidates.length,
    resolutionStatus: resolution?.status || 'missing',
    destination: destinationFor(intent),
    executionAllowed: false,
    writesPerformed: false,
    mutationSpec: null,
    toolExecuted: false
  }
}

export async function buildAgentCommandPreview({
  ownerId,
  profile,
  text,
  environment,
  sessionState = {},
  messageId = '',
  dependencies = {}
} = {}) {
  if (!ownerId) {
    throw errorWithStatus('Agent preview requires an owner profile.', 403, 'OWNER_REQUIRED')
  }

  const command = String(text || '').trim()
  if (!command) {
    throw errorWithStatus('请输入要预览的命令。', 400, 'EMPTY_COMMAND')
  }

  if (command.length > MAX_COMMAND_LENGTH) {
    throw errorWithStatus(`命令过长：最多 ${MAX_COMMAND_LENGTH} 个字符。`, 413, 'COMMAND_TOO_LONG')
  }

  const targetEnvironment = normalizeEnvironment(environment)
  const listConfigsImpl = dependencies.listAgentConfigs || listAgentConfigs
  const resolveAiImpl = dependencies.resolveUserAiConfig || resolveUserAiConfig
  const interpretImpl = dependencies.interpretUserIntent || interpretUserIntentWithSession
  const buildPlanImpl = dependencies.buildRoutePlan || buildRoutePlan
  const executeQueryImpl = dependencies.executeResourceQuery || executeResourceQuery
  const resolveEntitiesImpl = dependencies.resolveEntities || resolveEntities
  const gateImpl = dependencies.evaluateSemanticGate || evaluateSemanticGate

  const configs = await listConfigsImpl({ ownerId, environment: targetEnvironment })
  const config = latestPublishedConfig(configs)
  if (!config?.profile) {
    throw errorWithStatus(
      `${targetEnvironment} 尚无 published Agent profile，不能做命令预览。`,
      409,
      'NO_PUBLISHED_AGENT_PROFILE'
    )
  }

  const ai = await resolveAiImpl(profile)
  const modelConfig = modelConfiguration(ai, config.profile)
  if (!modelConfig.apiKey || !modelConfig.baseUrl || !modelConfig.model) {
    throw errorWithStatus('Agent preview 缺少可用模型配置。', 503, 'MODEL_CONFIG_MISSING')
  }

  const interpreted = await interpretImpl({
    text: command,
    sessionState,
    messageId: messageId || `desk-command-${crypto.randomUUID()}`,
    profile: config.profile,
    modelConfig,
    fetchImpl: dependencies.fetchImpl || fetch
  })

  const intent = interpreted.intent
  const plan = buildPlanImpl({ intent, profile: config.profile })
  const querySpec = safeQuerySpec(plan.querySpec)

  const candidates = querySpec
    ? await executeQueryImpl({
        ownerId,
        querySpec,
        adapters: dependencies.resourceAdapters || {}
      })
    : []

  const resolution = resolveEntitiesImpl({
    intent,
    candidates,
    sessionState,
    thresholds: config.profile.thresholds || {}
  })

  const gate = gateImpl({
    intent,
    plan,
    resolution,
    sessionState,
    budgetExceeded: Boolean(interpreted.budgetExceeded)
  })

  const publicCandidates = asArray(candidates).map(summarizeCandidate).filter(Boolean).slice(0, 8)
  const publicResolution = safeResolution(resolution)
  const publicPlan = {
    version: plan.version,
    planId: plan.planId,
    intentId: plan.intentId,
    capabilityId: plan.capabilityId,
    capabilityVersion: plan.capabilityVersion,
    querySpec,
    resolution: plan.resolution,
    steps: asArray(plan.steps),
    clarification: plan.clarification || null,
    mutationSpec: null
  }

  const summary = summarizeCommandPreview({
    intent,
    plan: publicPlan,
    gate,
    resolution: publicResolution,
    candidates: publicCandidates
  })

  return {
    ok: true,
    status: 'previewed',
    action: 'agent_command_preview',
    previewOnly: true,
    executionAllowed: false,
    writesPerformed: false,
    toolExecuted: false,
    environment: targetEnvironment,
    config: {
      id: config.id,
      version: config.version_number,
      status: config.status,
      checksum: config.checksum || ''
    },
    command,
    summary,
    intent,
    plan: publicPlan,
    resolution: publicResolution,
    gate,
    candidates: publicCandidates,
    usage: {
      modelCalls: interpreted.source === 'session_control' ? 0 : 1,
      inputTokens: Number(interpreted.usage?.inputTokens || 0),
      outputTokens: Number(interpreted.usage?.outputTokens || 0),
      estimatedUsd: Number(interpreted.estimatedUsd || 0),
      pricingUnknown: Boolean(interpreted.pricingUnknown),
      budgetExceeded: Boolean(interpreted.budgetExceeded),
      latencyMs: Number(interpreted.latencyMs || 0),
      source: interpreted.source || 'model'
    }
  }
}
