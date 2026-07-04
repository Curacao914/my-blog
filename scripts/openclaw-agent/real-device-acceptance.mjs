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
const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '')
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ''
const outputPath = argument(
  'output',
  path.join(process.cwd(), 'openclaw-agent-real-wechat-report.json')
)
const runTag = argument(
  'run-tag',
  Date.now().toString(36).slice(-6).toUpperCase()
)

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and a Supabase service credential are required for read-only trace acceptance.'
  )
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function eq(value) {
  return `eq.${encodeURIComponent(String(value || ''))}`
}

async function supabaseGet(pathname, attempts = 4) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1${pathname}`, {
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${supabaseKey}`
        },
        signal: controller.signal
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) return payload
      lastError = new Error(
        `Supabase HTTP ${response.status}: ${payload?.message || payload?.hint || 'request failed'}`
      )
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        throw lastError
      }
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }
    if (attempt < attempts) {
      await sleep(Math.min(4000, 500 * 2 ** (attempt - 1)))
    }
  }
  throw lastError || new Error('Supabase request failed')
}

async function resolveOwnerProfile() {
  const candidates = [
    process.env.WECHAT_OWNER_USER_ID,
    process.env.SCHEDULE_OWNER_USER_ID,
    ...(process.env.CLERK_ADMIN_USER_IDS || '').split(',')
  ].map(value => String(value || '').trim()).filter(Boolean)

  for (const clerkUserId of candidates) {
    const rows = await supabaseGet(
      `/profiles?select=id,clerk_user_id,role,status&clerk_user_id=${eq(clerkUserId)}&limit=1`
    )
    if (rows?.[0]?.id) {
      return { ...rows[0], source: 'environment' }
    }
  }

  const rows = await supabaseGet(
    '/profiles?select=id,clerk_user_id,role,status&role=eq.owner&status=eq.active&order=updated_at.desc&limit=1'
  )
  if (rows?.[0]?.id) {
    return { ...rows[0], source: 'supabase_read_only' }
  }
  throw new Error('No existing active owner profile is available for real-WeChat acceptance.')
}

const ownerProfile = await resolveOwnerProfile()

async function traces() {
  const rows = await supabaseGet(
    '/openclaw_conversation_states' +
    '?select=sender_id,thread_id,state,updated_at' +
    `&owner_id=${eq(ownerProfile.id)}` +
    '&channel=eq.openclaw-weixin' +
    '&order=updated_at.desc&limit=30'
  )
  return (rows || []).flatMap(row => {
    const recent = Array.isArray(row?.state?.recentTraces)
      ? row.state.recentTraces
      : []
    return recent.map(trace => ({
      ...trace,
      senderId: row.sender_id || '',
      threadId: row.thread_id || ''
    }))
  })
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
console.log(`本轮唯一标识：${runTag}。每条发送后回到终端按 Enter。`)
console.log('验收证据将从 Supabase trace 中只读获取，不需要本地微信入口 token 或发送者白名单。\n')

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
  version: 3,
  runTag,
  scheduleTitle,
  readingUrl,
  baseUrl,
  executedAt: new Date().toISOString(),
  evidenceSource: 'supabase_openclaw_conversation_states_read_only',
  ownerProfileSource: ownerProfile.source,
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
    senderIdObserved: item.trace?.senderId ? 'present' : 'missing',
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
