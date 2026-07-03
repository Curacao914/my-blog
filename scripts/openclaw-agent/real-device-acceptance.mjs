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
const senderId =
  argument('sender-id', process.env.WECHAT_ALLOWED_SENDER_ID || '')
const threadId = argument('thread-id', senderId || 'default')
const outputPath = argument(
  'output',
  path.join(process.cwd(), 'openclaw-agent-real-wechat-report.json')
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

async function traces() {
  const url = new URL(
    '/api/integrations/openclaw/traces',
    baseUrl
  )
  url.searchParams.set('senderId', senderId)
  url.searchParams.set('threadId', threadId)
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`
    }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      `trace endpoint HTTP ${response.status}: ${payload.error || ''}`
    )
  }
  return payload.traces || []
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForTrace({
  input,
  after,
  expectedCapability,
  expectedPolicy,
  timeoutMs = 45000
}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
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
      return {
        ok: errors.length === 0,
        errors,
        trace: match
      }
    }
    await sleep(1500)
  }
  return {
    ok: false,
    errors: ['trace not observed before timeout'],
    trace: null
  }
}

const cases = [
  {
    id: 'read-today',
    input: '我今天有什么安排',
    capability: 'schedule.list'
  },
  {
    id: 'create-schedule',
    input: '明天新增一个Agent真机验收事项',
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
    input: '把 https://example.com/law-tech-agent-e2e 保存到待读',
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

console.log(
  '\n请保持本脚本运行，并在真实微信中逐条发送它显示的原文。'
)
console.log(
  '每条发送后回到终端按 Enter；脚本会从受保护 trace 接口核验真实链路。\n'
)

const results = []
for (const testCase of cases) {
  const after = Date.now() - 1000
  await rl.question(
    `微信发送：${testCase.input}\n发送完成后按 Enter：`
  )
  const result = await waitForTrace({
    input: testCase.input,
    after,
    expectedCapability: testCase.capability
  })
  results.push({
    ...testCase,
    ...result
  })
  console.log(result.ok ? '✓ 通过\n' : `✗ ${result.errors.join('; ')}\n`)
  if (!result.ok) break
}

let bulkAccepted = false
if (results.every(item => item.ok)) {
  const answer = await rl.question(
    '下一项会把当前全部未读课程简报标记为已读，用于验收 all_unread。输入 YES 继续：'
  )
  bulkAccepted = answer.trim() === 'YES'
  if (bulkAccepted) {
    const testCase = {
      id: 'course-all-unread',
      input: '未读课程简报已全部读完',
      capability: 'course.brief.mark_read'
    }
    const after = Date.now() - 1000
    await rl.question(
      `微信发送：${testCase.input}\n发送完成后按 Enter：`
    )
    const result = await waitForTrace({
      input: testCase.input,
      after,
      expectedCapability: testCase.capability,
      expectedPolicy: 'allow'
    })
    results.push({
      ...testCase,
      ...result
    })
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
    input: '删除Agent真机验收事项',
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
    input: '删除law-tech-agent-e2e这条待读',
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
  console.log(
    '下面清理刚才创建的测试日程与待读，同时验收删除确认门禁。\n'
  )
  for (const testCase of cleanupCases) {
    const after = Date.now() - 1000
    await rl.question(
      `微信发送：${testCase.input}\n发送完成后按 Enter：`
    )
    const result = await waitForTrace({
      input: testCase.input,
      after,
      expectedCapability: testCase.capability,
      expectedPolicy: testCase.policy
    })
    results.push({
      ...testCase,
      ...result
    })
    console.log(result.ok ? '✓ 通过\n' : `✗ ${result.errors.join('; ')}\n`)
    if (!result.ok) break
  }
}

rl.close()

const passed = results.length === cases.length + 1 + cleanupCases.length &&
  results.every(item => item.ok)

const report = {
  version: 1,
  baseUrl,
  executedAt: new Date().toISOString(),
  passed,
  bulkAccepted,
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

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(report, null, 2)}\n`
)
console.log(
  passed
    ? `真实微信验收通过，报告：${outputPath}`
    : `真实微信验收未通过，现场与报告已保留：${outputPath}`
)
if (!passed) process.exitCode = 1
