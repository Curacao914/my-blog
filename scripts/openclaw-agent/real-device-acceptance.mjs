import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline/promises'

function argument(name, fallback = '') {
  const prefix = `--${name}=`
  const value = process.argv.find(item => item.startsWith(prefix))
  return value ? value.slice(prefix.length) : fallback
}

const baseUrl = argument(
  'base-url',
  process.env.LAW_TECH_REAL_BASE_URL || 'https://law-tech.dev'
)
const token = process.env.WECHAT_CAPTURE_TOKEN || ''
const senderId = argument(
  'sender-id',
  process.env.WECHAT_ALLOWED_SENDER_ID || ''
)
const threadId = argument('thread-id', senderId || 'default')
const outputPath = argument(
  'output',
  path.join(process.cwd(), 'openclaw-agent-real-wechat-report.json')
)
const runTag = argument(
  'run-tag',
  Date.now().toString(36).slice(-6).toUpperCase()
)

if (!token) {
  throw new Error(
    'WECHAT_CAPTURE_TOKEN is required in the local environment; do not paste it into chat.'
  )
}
if (!senderId) {
  throw new Error(
    'WECHAT_ALLOWED_SENDER_ID is required in the local environment.'
  )
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson(url, options = {}, attempts = 4) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      const payload = await response.json().catch(() => ({}))
      if (response.ok) return { response, payload }
      lastError = new Error(
        `HTTP ${response.status}: ${payload.error || 'request failed'}`
      )
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        throw lastError
      }
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }
    if (attempt < attempts) await sleep(Math.min(4000, 500 * 2 ** (attempt - 1)))
  }
  throw lastError || new Error('request failed')
}

async function traces() {
  const url = new URL(
    '/api/integrations/openclaw/traces',
    baseUrl
  )
  url.searchParams.set('senderId', senderId)
  url.searchParams.set('threadId', threadId)
  const { payload } = await fetchJson(url, {
    headers: { authorization: `Bearer ${token}` }
  })
  return payload.traces || []
}

async function waitForTrace({
  input,
  after,
  expectedCapability,
  expectedPolicy,
  timeoutMs = 60000
}) {
  const deadline = Date.now() + timeoutMs
  let lastReadError = ''
  while (Date.now() < deadline) {
    try {
      const values = await traces()
      const match = [...values].reverse().find(trace =>
        trace.input === input &&
        Date.parse(trace.startedAt || 0) >= after
      )
      if (match) {
        const errors = []
        if (
          expectedCapability &&
          match.routePlan?.capability !== expectedCapability
        ) {
          errors.push(
            `capability expected ${expectedCapability}, got ${match.routePlan?.capability}`
          )
        }
        if (
          expectedPolicy &&
          match.policy?.decision !== expectedPolicy
        ) {
          errors.push(
            `policy expected ${expectedPolicy}, got ${match.policy?.decision}`
          )
        }
        if (match.error) errors.push(match.error)
        return { ok: errors.length === 0, errors, trace: match }
      }
    } catch (error) {
      lastReadError = error.message || String(error)
    }
    await sleep(1500)
  }
  return {
    ok: false,
    errors: [
      'trace not observed before timeout',
      ...(lastReadError ? [`last trace read error: ${lastReadError}`] : [])
    ],
    trace: null
  }
}

await traces()

const scheduleTitle = `Agent真机验收-${runTag}`
const readingUrl = `https://example.com/law-tech-agent-e2e-${runTag}`
const cases = [
  {
    id: 'read-today',
    input: '我今天有什么安排',
    capability: 'schedule.list'
  },
  {
    id: 'create-schedule',
    input: `明天新增一个${scheduleTitle}`,
    capability: 'schedule.create'
  },
  {
    id: 'update-created-context',
    input: '时间改到十点',
    capability: 'schedule.update'
  },
  {
    id: 'complete-context',
    input: '这个完成了',
    capability: 'schedule.complete'
  },
  {
    id: 'create-reading',
    input: `把 ${readingUrl} 保存到待读`,
    capability: 'reading.create'
  },
  {
    id: 'mark-reading-context',
    input: '这个读完了',
    capability: 'reading.mark_read'
  },
  {
    id: 'list-course-unread',
    input: '查看未读课程简报',
    capability: 'course.brief.list'
  }
]

console.log('\n请保持本脚本运行，并在真实微信中逐条发送它显示的原文。')
console.log(`本轮唯一标识：${runTag}。每条发送后回到终端按 Enter。\n`)

const results = []
for (const testCase of cases) {
  const after = Date.now() - 1000
  await rl.question(`微信发送：${testCase.input}\n发送完成后按 Enter：`)
  const result = await waitForTrace({
    input: testCase.input,
    after,
    expectedCapability: testCase.capability
  })
  results.push({ ...testCase, ...result })
  console.log(result.ok ? '✓ 通过\n' : `✗ ${result.errors.join('; ')}\n`)
  if (!result.ok) break
}

let bulkAccepted = false
if (results.every(item => item.ok) && results.length === cases.length) {
  const answer = await rl.question(
    '下一项会把当前全部未读课程简报标记为已读。输入 YES 继续：'
  )
  bulkAccepted = answer.trim() === 'YES'
  if (bulkAccepted) {
    const testCase = {
      id: 'course-all-unread',
      input: '未读课程简报已全部读完',
      capability: 'course.brief.mark_read'
    }
    const after = Date.now() - 1000
    await rl.question(`微信发送：${testCase.input}\n发送完成后按 Enter：`)
    const result = await waitForTrace({
      input: testCase.input,
      after,
      expectedCapability: testCase.capability,
      expectedPolicy: 'allow'
    })
    results.push({ ...testCase, ...result })
    console.log(result.ok ? '✓ 通过\n' : `✗ ${result.errors.join('; ')}\n`)
  } else {
    results.push({
      id: 'course-all-unread',
      input: '未读课程简报已全部读完',
      capability: 'course.brief.mark_read',
      ok: false,
      errors: ['user did not consent to real all_unread mutation'],
      trace: null
    })
  }
}

const cleanupCases = [
  {
    id: 'delete-test-schedule',
    input: `删除${scheduleTitle}`,
    capability: 'schedule.delete',
    policy: 'confirm'
  },
  {
    id: 'confirm-delete-schedule',
    input: '确认',
    capability: 'schedule.delete',
    policy: 'allow'
  },
  {
    id: 'delete-test-reading',
    input: `删除${readingUrl}这条待读`,
    capability: 'reading.delete',
    policy: 'confirm'
  },
  {
    id: 'confirm-delete-reading',
    input: '确认',
    capability: 'reading.delete',
    policy: 'allow'
  }
]

if (results.every(item => item.ok)) {
  console.log('下面清理本轮测试对象，同时验收删除确认门禁。\n')
  for (const testCase of cleanupCases) {
    const after = Date.now() - 1000
    await rl.question(`微信发送：${testCase.input}\n发送完成后按 Enter：`)
    const result = await waitForTrace({
      input: testCase.input,
      after,
      expectedCapability: testCase.capability,
      expectedPolicy: testCase.policy
    })
    results.push({ ...testCase, ...result })
    console.log(result.ok ? '✓ 通过\n' : `✗ ${result.errors.join('; ')}\n`)
    if (!result.ok) break
  }
}

rl.close()

const expectedCount = cases.length + 1 + cleanupCases.length
const passed = results.length === expectedCount && results.every(item => item.ok)
const report = {
  version: 2,
  runTag,
  scheduleTitle,
  readingUrl,
  baseUrl,
  executedAt: new Date().toISOString(),
  passed,
  bulkAccepted,
  cleanupCompleted: cleanupCases.every(cleanup =>
    results.some(item => item.id === cleanup.id && item.ok)
  ),
  cases: results.map(item => ({
    id: item.id,
    input: item.input,
    expectedCapability: item.capability,
    expectedPolicy: item.policy || '',
    ok: item.ok,
    errors: item.errors,
    traceId: item.trace?.traceId || '',
    routePlan: item.trace?.routePlan || null,
    policy: item.trace?.policy || null,
    toolResults: item.trace?.toolResults || []
  }))
}

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  passed
    ? `真实微信验收通过，报告：${outputPath}`
    : `真实微信验收未通过，现场与报告已保留：${outputPath}`
)
if (!passed) process.exitCode = 1
