import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

function argument(name, fallback = '') {
  const prefix = `--${name}=`
  const value = process.argv.find(item => item.startsWith(prefix))
  return value ? value.slice(prefix.length) : fallback
}

const baseUrl = argument('base-url', process.env.LAW_TECH_EVAL_BASE_URL || '')
const token = process.env.WECHAT_CAPTURE_TOKEN || ''
const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
const senderId = argument(
  'sender-id',
  process.env.WECHAT_ALLOWED_SENDER_ID || 'eval-preview'
)
const fixturePath = argument(
  'fixture',
  path.join(process.cwd(), '__tests__/fixtures/openclaw-agent-eval-v1.json')
)
const outputPath = argument(
  'output',
  path.join(process.cwd(), 'openclaw-agent-eval-report.json')
)
const timeoutMs = Math.max(5000, Number(argument('timeout-ms', '60000')) || 60000)
const maxAttempts = Math.max(1, Math.min(5, Number(argument('retries', '3')) || 3))

if (!baseUrl) throw new Error('Missing --base-url')
if (!token) {
  throw new Error(
    'WECHAT_CAPTURE_TOKEN is required in the local environment; do not paste it into chat.'
  )
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))

const object = (id, type, title) => ({ id, type, title })

const sessionFixtures = {
  lastCreatedSchedule: {
    lastCreatedObject: object(
      '11111111-1111-4111-8111-111111111111',
      'schedule',
      'Agent 真机验收事项'
    )
  },
  lastSelectedSchedule: {
    lastSelectedObject: object(
      '11111111-1111-4111-8111-111111111111',
      'schedule',
      'Agent 真机验收事项'
    )
  },
  lastSelectedReading: {
    lastSelectedObject: object(
      '22222222-2222-4222-8222-222222222222',
      'reading',
      '善意取得文章'
    )
  },
  lastCreatedReading: {
    lastCreatedObject: object(
      '22222222-2222-4222-8222-222222222222',
      'reading',
      '善意取得文章'
    )
  },
  courseResultSet: {
    lastResultSet: [
      object(
        '33333333-3333-4333-8333-333333333333:lesson-a',
        'course_brief',
        '国际法 · 6月3日'
      ),
      object(
        '44444444-4444-4444-8444-444444444444:lesson-b',
        'course_brief',
        '国际法 · 6月10日'
      )
    ]
  },
  pendingDelete: {
    pendingConfirmation: {
      plan: {
        version: 1,
        decision: 'act',
        domain: 'schedule',
        capability: 'schedule.delete',
        operation: 'delete',
        scope: 'selected',
        target: { contextRefs: ['lastCreated'] },
        parameters: {},
        confidence: 1,
        needsRetrieval: true
      },
      targets: [
        object(
          '11111111-1111-4111-8111-111111111111',
          'schedule',
          'Agent 真机验收事项'
        )
      ],
      expiresAt: '2099-01-01T00:00:00.000Z'
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function forbiddenReminderFields(value, pathPrefix = '') {
  if (!value || typeof value !== 'object') return []
  const forbidden = new Set([
    'reminder',
    'reminders',
    'remindat',
    'remind_at',
    'notification',
    'notifications',
    'channel',
    'channels'
  ])
  const found = []
  for (const [key, child] of Object.entries(value)) {
    const pathValue = pathPrefix ? `${pathPrefix}.${key}` : key
    if (forbidden.has(String(key).toLowerCase())) found.push(pathValue)
    found.push(...forbiddenReminderFields(child, pathValue))
  }
  return found
}

function validate(testCase, routePlan) {
  const errors = []
  const expected = testCase.expected || {}
  if (expected.capability && routePlan.capability !== expected.capability) {
    errors.push(
      `capability expected ${expected.capability}, got ${routePlan.capability}`
    )
  }
  if (expected.scope && routePlan.scope !== expected.scope) {
    errors.push(`scope expected ${expected.scope}, got ${routePlan.scope}`)
  }
  if (expected.decision && routePlan.decision !== expected.decision) {
    errors.push(
      `decision expected ${expected.decision}, got ${routePlan.decision}`
    )
  }
  if (
    expected.contextRef &&
    !(routePlan.target?.contextRefs || []).includes(expected.contextRef)
  ) {
    errors.push(`contextRef expected ${expected.contextRef}`)
  }
  if (expected.filters) {
    for (const [key, value] of Object.entries(expected.filters)) {
      if (routePlan.target?.filters?.[key] !== value) {
        errors.push(
          `filter ${key} expected ${value}, got ${routePlan.target?.filters?.[key]}`
        )
      }
    }
  }
  if (expected.policy === 'confirm' && routePlan.risk !== 'destructive') {
    errors.push(`risk expected destructive, got ${routePlan.risk}`)
  }
  if (expected.policy === 'deny_exact_wechat_reminder') {
    const forbidden = forbiddenReminderFields(routePlan.parameters || {})
    if (forbidden.length) {
      errors.push(`forbidden reminder fields: ${forbidden.join(', ')}`)
    }
  }
  return errors
}

function requestHeaders() {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    ...(vercelBypass
      ? {
          'x-vercel-protection-bypass': vercelBypass,
          'x-vercel-set-bypass-cookie': 'true'
        }
      : {})
  }
}

async function fetchRoute({ id, input, sessionFixture = '' }) {
  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/api/integrations/openclaw/command`,
        {
          method: 'POST',
          headers: requestHeaders(),
          signal: controller.signal,
          body: JSON.stringify({
            command: input,
            senderId,
            threadId: `fixed-eval-${fixture.version}-${id}`,
            messageId: `fixed-eval-${fixture.version}-${id}-${attempt}`,
            receivedAt: `${fixture.referenceDate}T12:00:00+08:00`,
            evaluationMode: 'router',
            evaluationSession: sessionFixtures[sessionFixture] || {}
          })
        }
      )
      const payload = await response.json().catch(() => ({}))
      if (response.ok) {
        return { response, payload, attempts: attempt }
      }
      const message = `HTTP ${response.status}: ${payload.error || 'missing RoutePlan'}`
      lastError = new Error(message)
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        return { response, payload, attempts: attempt, error: lastError }
      }
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }
    if (attempt < maxAttempts) await sleep(Math.min(4000, 500 * 2 ** (attempt - 1)))
  }
  return { response: null, payload: {}, attempts: maxAttempts, error: lastError }
}

function resultFromRequest(testCase, requestResult) {
  const { response, payload, attempts, error } = requestResult
  const errors = []
  if (error) errors.push(error.message || String(error))
  if (!response?.ok) {
    if (!errors.length) errors.push(`HTTP ${response?.status || 0}: request failed`)
  } else if (payload.action !== 'router_evaluation') {
    errors.push(
      `evaluation safety precondition failed: action ${payload.action || 'missing'} is not router_evaluation`
    )
  } else if (!payload.routePlan) {
    errors.push('missing RoutePlan')
  } else {
    errors.push(...validate(testCase, payload.routePlan))
  }
  return {
    id: testCase.id,
    input: testCase.input,
    ok: errors.length === 0,
    errors,
    attempts,
    routePlan: payload.routePlan || null,
    traceId: payload.traceId || '',
    action: payload.action || '',
    httpStatus: response?.status || 0
  }
}

const preflightCase = {
  id: 'evaluation-safety-preflight',
  input: '你现在能做什么',
  expected: { capability: 'agent.help', scope: 'single' }
}
const preflight = resultFromRequest(
  preflightCase,
  await fetchRoute({
    id: preflightCase.id,
    input: preflightCase.input
  })
)

const results = []
if (preflight.ok) {
  for (const testCase of fixture.cases || []) {
    const requestResult = await fetchRoute({
      id: testCase.id,
      input: testCase.input,
      sessionFixture: testCase.sessionFixture || ''
    })
    const result = resultFromRequest(testCase, requestResult)
    results.push(result)
    if (result.httpStatus === 401 || result.httpStatus === 403) break
    await sleep(120)
  }
}

const report = {
  version: fixture.version,
  baseUrl,
  executedAt: new Date().toISOString(),
  protectionBypassUsed: Boolean(vercelBypass),
  preflight,
  total: (fixture.cases || []).length,
  executed: results.length,
  passed: results.filter(item => item.ok).length,
  failed:
    (preflight.ok ? 0 : 1) +
    results.filter(item => !item.ok).length +
    Math.max(0, (fixture.cases || []).length - results.length),
  results
}

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `OpenClaw Agent fixed evaluation: ${report.passed}/${report.total} passed; preflight=${preflight.ok ? 'ok' : 'failed'}`
)
if (!preflight.ok) {
  console.error(`evaluation safety preflight: ${preflight.errors.join('; ')}`)
}
for (const item of results.filter(result => !result.ok)) {
  console.error(`${item.id}: ${item.errors.join('; ')}`)
}
if (!preflight.ok || report.passed !== report.total || report.executed !== report.total) {
  process.exitCode = 1
}
