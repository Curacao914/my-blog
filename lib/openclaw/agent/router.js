import {
  compactCapabilityCatalog,
  capabilityRegistry
} from './capabilities'
import {
  normalizeRoutePlan,
  validateRoutePlan
} from './contracts'
import { compactSessionForRouter } from './session'

function stripCodeFence(value = '') {
  const text = String(value || '').trim()
  if (!text.startsWith('```')) return text
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function extractJsonObject(value = '') {
  const text = stripCodeFence(value)
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('ROUTER_OUTPUT_NOT_JSON')
    return JSON.parse(text.slice(start, end + 1))
  }
}

function routerSystemPrompt(catalog) {
  return [
    '你是 Law-Tech 微信自然语言控制平面的 Router。',
    '你只负责理解意图并输出一个严格 JSON RoutePlan；你不执行工具，不写 SQL，不编造对象 ID。',
    '用户可以自然表达，不要求固定句式。正则不是意图权威。',
    '只可选择给定 capability。对象写入必须先通过 Resource 返回真实候选。',
    '没有模型能力、没有真实对象、存在歧义时要 clarify；不得退化为猜测写入。',
    'Law-Tech 不新增精确到点的微信提醒。用户可以给日程记录时间，但 parameters 中不得生成 reminders、remindAt 或通知渠道。',
    '课程简报已读范围：single、matching、all_unread。用户明确说全部未读/所有没看的时使用 all_unread。',
    '“这个/刚才那个”使用 target.contextRefs；创建后的时间修改优先 lastCreated，查询后指代优先 lastSelected。',
    '删除使用 destructive capability；普通写入不得伪装成删除。',
    '',
    'RoutePlan schema:',
    JSON.stringify({
      version: 1,
      decision: 'act | retrieve | answer | clarify | ignore',
      domain: 'schedule | reading | course | agent',
      capability: 'registered capability id',
      operation: 'list | create | update | complete | mark_read | delete | confirm | cancel',
      scope: 'single | selected | matching | all | all_unread | today | tomorrow | week | overdue',
      target: {
        ids: [],
        query: 'natural target query',
        contextRefs: ['lastSelected | lastCreated | lastUpdated | lastResultSet'],
        filters: {
          courseName: '',
          lessonDate: 'YYYY-MM-DD',
          read: false
        }
      },
      parameters: {
        item: {
          title: '',
          date: 'YYYY-MM-DD | reading | none',
          time: 'HH:mm',
          place: '',
          url: ''
        },
        patch: {
          title: '',
          date: '',
          time: '',
          place: '',
          status: ''
        }
      },
      sourcePreference: 'internal',
      risk: 'read | reversible_write | bulk_write | destructive | privileged',
      confidence: 0.95,
      needsRetrieval: true
    }),
    '',
    'Capabilities:',
    JSON.stringify(catalog)
  ].join('\n')
}

function routerUserPrompt({
  text,
  now,
  timeZone,
  session
}) {
  return [
    `Current time: ${now.toISOString()}`,
    `Timezone: ${timeZone}`,
    'Structured session:',
    JSON.stringify(compactSessionForRouter(session)),
    'User message:',
    String(text || '')
  ].join('\n')
}

async function requestModel({
  apiKey,
  baseUrl,
  model,
  messages,
  fetchImpl = fetch
}) {
  const response = await fetchImpl(
    `${String(baseUrl || '').replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages
      })
    }
  )
  const raw = await response.text()
  let payload = {}
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = {}
  }
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message ||
      payload?.message ||
      `Router model failed with ${response.status}`
    )
    error.status = response.status
    error.code = 'ROUTER_MODEL_FAILED'
    throw error
  }
  return {
    content: payload.choices?.[0]?.message?.content || '',
    usage: payload.usage || {},
    providerRequestId: response.headers?.get?.('x-request-id') || ''
  }
}

export async function routeWithModel({
  text,
  now = new Date(),
  timeZone = 'Asia/Shanghai',
  session = {},
  modelConfig = {},
  registry = capabilityRegistry,
  fetchImpl = fetch
} = {}) {
  const apiKey = String(modelConfig.apiKey || '')
  const baseUrl = String(modelConfig.baseUrl || '')
  const model = String(
    modelConfig.models?.router ||
    modelConfig.models?.schedule ||
    modelConfig.models?.default ||
    ''
  )

  if (!apiKey || !baseUrl || !model) {
    const error = new Error('Router model is not configured')
    error.status = 503
    error.code = 'ROUTER_MODEL_NOT_CONFIGURED'
    throw error
  }

  const catalog = compactCapabilityCatalog(registry)
  const modelResult = await requestModel({
    apiKey,
    baseUrl,
    model,
    fetchImpl,
    messages: [
      {
        role: 'system',
        content: routerSystemPrompt(catalog)
      },
      {
        role: 'user',
        content: routerUserPrompt({
          text,
          now,
          timeZone,
          session
        })
      }
    ]
  })

  const parsed = extractJsonObject(modelResult.content)
  const validation = validateRoutePlan(parsed, registry)
  if (!validation.ok) {
    const error = new Error(
      `Invalid RoutePlan: ${validation.errors.join(', ')}`
    )
    error.status = 422
    error.code = 'INVALID_ROUTE_PLAN'
    error.details = validation.errors
    throw error
  }

  return {
    plan: normalizeRoutePlan(validation.plan),
    model: {
      provider: 'openai-compatible',
      model,
      usage: modelResult.usage,
      requestId: modelResult.providerRequestId
    }
  }
}
