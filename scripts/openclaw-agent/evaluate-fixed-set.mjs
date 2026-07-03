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
const senderId =
  argument('sender-id', process.env.WECHAT_ALLOWED_SENDER_ID || 'eval-preview')
const fixturePath = argument(
  'fixture',
  path.join(
    process.cwd(),
    '__tests__/fixtures/openclaw-agent-eval-v1.json'
  )
)
const outputPath = argument(
  'output',
  path.join(process.cwd(), 'openclaw-agent-eval-report.json')
)

if (!baseUrl) throw new Error('Missing --base-url')
if (!token) {
  throw new Error(
    'WECHAT_CAPTURE_TOKEN is required in the local environment; do not paste it into chat.'
  )
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))

const object = (id, type, title) => ({
  id,
  type,
  title
})

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
        target: {
          contextRefs: ['lastCreated']
        },
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

function validate(testCase, routePlan) {
  const errors = []
  const expected = testCase.expected || {}
  if (expected.capability && routePlan.capability !== expected.capability) {
    errors.push(
      `capability expected ${expected.capability}, got ${routePlan.capability}`
    )
  }
  if (expected.scope && routePlan.scope !== expected.scope) {
    errors.push(
      `scope expected ${expected.scope}, got ${routePlan.scope}`
    )
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
    errors.push(
      `contextRef expected ${expected.contextRef}`
    )
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
  return errors
}

const results = []
for (const testCase of fixture.cases || []) {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/api/integrations/openclaw/command`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(vercelBypass
          ? {
              'x-vercel-protection-bypass': vercelBypass,
              'x-vercel-set-bypass-cookie': 'true'
            }
          : {})
      },
      body: JSON.stringify({
        command: testCase.input,
        senderId,
        threadId: `fixed-eval-${testCase.id}`,
        messageId: `fixed-eval-${Date.now()}-${testCase.id}`,
        receivedAt: `${fixture.referenceDate}T12:00:00+08:00`,
        evaluationMode: 'router',
        evaluationSession:
          sessionFixtures[testCase.sessionFixture] || {}
      })
    }
  )
  const payload = await response.json().catch(() => ({}))
  const errors = response.ok && payload.routePlan
    ? validate(testCase, payload.routePlan)
    : [
        `HTTP ${response.status}: ${payload.error || 'missing RoutePlan'}`
      ]
  results.push({
    id: testCase.id,
    input: testCase.input,
    ok: errors.length === 0,
    errors,
    routePlan: payload.routePlan || null,
    traceId: payload.traceId || ''
  })
}

const report = {
  version: fixture.version,
  baseUrl,
  executedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter(item => item.ok).length,
  failed: results.filter(item => !item.ok).length,
  results
}

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `OpenClaw Agent fixed evaluation: ${report.passed}/${report.total} passed`
)
if (report.failed) {
  for (const item of results.filter(result => !result.ok)) {
    console.error(`${item.id}: ${item.errors.join('; ')}`)
  }
  process.exitCode = 1
}
