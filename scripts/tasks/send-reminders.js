#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function parseArgs(argv) {
  const args = {}
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue

    const key = arg.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      index += 1
    }
  }
  return args
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\n/)
      .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map(line => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

function loadEnv() {
  return {
    ...parseEnvFile(path.join(process.cwd(), '.env.local')),
    ...process.env
  }
}

function getSupabaseConfig(env) {
  const supabaseUrl = env.SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL and service-role/secret key.')
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  }
}

async function supabaseRequest(env, pathname, options = {}) {
  const config = getSupabaseConfig(env)
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...config.headers,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed ${response.status}: ${text}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function encodeFilterValue(value) {
  return encodeURIComponent(value).replace(/\./g, '%2E')
}

async function resolveOwnerId(env) {
  if (env.TASK_REMINDER_OWNER_PROFILE_ID) return env.TASK_REMINDER_OWNER_PROFILE_ID
  if (!env.SCHEDULE_OWNER_USER_ID) {
    throw new Error('Set TASK_REMINDER_OWNER_PROFILE_ID or SCHEDULE_OWNER_USER_ID before reading legacy task reminders.')
  }
  const rows = await supabaseRequest(env, `/profiles?select=id&clerk_user_id=eq.${encodeURIComponent(env.SCHEDULE_OWNER_USER_ID)}&limit=1`)
  const ownerId = rows?.[0]?.id
  if (!ownerId) throw new Error('Configured task reminder owner profile was not found.')
  return ownerId
}

async function listDueReminders(env, ownerId, options = {}) {
  if (!ownerId) throw new Error('ownerId is required')
  const now = options.now || new Date().toISOString()
  const limit = Number(options.limit || 20)
  const select = [
    'id',
    'owner_id',
    'title',
    'status',
    'type',
    'priority',
    'starts_at',
    'due_at',
    'remind_at',
    'place',
    'links',
    'file_refs',
    'source',
    'source_user',
    'notes',
    'created_at'
  ].join(',')

  return supabaseRequest(
    env,
    `/tasks?select=${select}&owner_id=eq.${encodeURIComponent(ownerId)}&remind_at=lte.${encodeFilterValue(now)}&reminder_sent_at=is.null&status=not.in.(done,archived)&order=remind_at.asc&limit=${limit}`
  )
}

async function markReminderSent(env, ownerId, taskId) {
  const rows = await supabaseRequest(env, `/tasks?id=eq.${encodeURIComponent(taskId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      reminder_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  })

  return rows?.[0] || null
}

function formatDate(value) {
  if (!value) return '未设置'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTask(task) {
  return [
    `- ${task.title}`,
    `  - 提醒：${formatDate(task.remind_at)}`,
    task.starts_at ? `  - 时间：${formatDate(task.starts_at)}` : null,
    task.place ? `  - 地点：${task.place}` : null,
    task.priority ? `  - 优先级：${task.priority}` : null,
    task.source ? `  - 来源：${task.source}` : null
  ]
    .filter(Boolean)
    .join('\n')
}

function buildReminderMarkdown(tasks) {
  if (!tasks.length) return '当前没有到期提醒。'

  return [
    `# law-tech 事项提醒（${tasks.length}）`,
    '',
    ...tasks.map(formatTask),
    '',
    '> 这条消息来自 law-tech.dev 事项提醒队列。'
  ].join('\n')
}

async function sendWecom(env, markdown) {
  const webhook = env.WECOM_BOT_WEBHOOK || env.TASK_WECOM_WEBHOOK
  if (!webhook) {
    throw new Error('Missing WECOM_BOT_WEBHOOK or TASK_WECOM_WEBHOOK.')
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        content: markdown
      }
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`WeCom webhook failed ${response.status}: ${text}`)
  }

  const result = await response.json().catch(() => ({}))
  if (result.errcode && result.errcode !== 0) {
    throw new Error(`WeCom webhook error ${result.errcode}: ${result.errmsg || ''}`)
  }

  return result
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    console.log(
      [
        'Usage:',
        '  npm run tasks:reminders:send',
        '  npm run tasks:reminders:send -- --channel wecom --send',
        '  npm run tasks:reminders:send -- --channel wecom --send --no-mark',
        '',
        'Default is dry-run. It prints due reminders but does not send anything.',
        'WeCom sending requires WECOM_BOT_WEBHOOK or TASK_WECOM_WEBHOOK.',
        'Successful sends are marked reminder_sent_at unless --no-mark is provided.'
      ].join('\n')
    )
    return
  }

  const env = loadEnv()
  const channel = args.channel || 'console'
  const shouldSend = Boolean(args.send)
  const shouldMark = shouldSend && !args['no-mark']
  const ownerId = await resolveOwnerId(env)
  const due = await listDueReminders(env, ownerId, {
    now: args.now,
    limit: args.limit
  })
  const markdown = buildReminderMarkdown(due || [])
  const sent = []
  const marked = []

  if (shouldSend && due?.length) {
    if (channel === 'wecom') {
      await sendWecom(env, markdown)
      sent.push({ channel, count: due.length })
    } else {
      throw new Error(`Unsupported send channel: ${channel}`)
    }

    if (shouldMark) {
      for (const task of due) {
        const updated = await markReminderSent(env, ownerId, task.id)
        marked.push({ id: updated?.id || task.id, title: updated?.title || task.title })
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        channel,
        dryRun: !shouldSend,
        count: due?.length || 0,
        markdown,
        sent,
        marked
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
