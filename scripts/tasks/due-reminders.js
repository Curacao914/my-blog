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

function getConfig() {
  const localEnv = parseEnvFile(path.join(process.cwd(), '.env.local'))
  const supabaseUrl = process.env.SUPABASE_URL || localEnv.SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    localEnv.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL and service-role/secret key.')
  }

  return {
    ownerProfileId: process.env.TASK_REMINDER_OWNER_PROFILE_ID || localEnv.TASK_REMINDER_OWNER_PROFILE_ID || '',
    ownerClerkUserId: process.env.SCHEDULE_OWNER_USER_ID || localEnv.SCHEDULE_OWNER_USER_ID || '',
    baseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  }
}

async function request(pathname, options = {}) {
  const config = getConfig()
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

async function resolveOwnerId() {
  const config = getConfig()
  if (config.ownerProfileId) return config.ownerProfileId
  if (!config.ownerClerkUserId) {
    throw new Error('Set TASK_REMINDER_OWNER_PROFILE_ID or SCHEDULE_OWNER_USER_ID before reading legacy task reminders.')
  }
  const rows = await request(`/profiles?select=id&clerk_user_id=eq.${encodeURIComponent(config.ownerClerkUserId)}&limit=1`)
  const ownerId = rows?.[0]?.id
  if (!ownerId) throw new Error('Configured task reminder owner profile was not found.')
  return ownerId
}

async function listDueReminders(ownerId, options = {}) {
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

  return request(
    `/tasks?select=${select}&owner_id=eq.${encodeURIComponent(ownerId)}&remind_at=lte.${encodeFilterValue(now)}&reminder_sent_at=is.null&status=not.in.(done,archived)&order=remind_at.asc&limit=${limit}`
  )
}

async function markReminderSent(ownerId, taskId) {
  const rows = await request(`/tasks?id=eq.${encodeURIComponent(taskId)}&owner_id=eq.${encodeURIComponent(ownerId)}`, {
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

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) {
    console.log(
      [
        'Usage:',
        '  npm run tasks:reminders:due',
        '  npm run tasks:reminders:due -- --limit 50',
        '  npm run tasks:reminders:due -- --mark-sent',
        '',
        'This lists tasks whose remind_at is due and reminder_sent_at is still empty.',
        'It does not send notifications yet. Use --mark-sent only after an external notifier succeeds.'
      ].join('\n')
    )
    return
  }

  const ownerId = await resolveOwnerId()
  const due = await listDueReminders(ownerId, {
    now: args.now,
    limit: args.limit
  })
  const marked = []

  if (args['mark-sent']) {
    for (const task of due || []) {
      const updated = await markReminderSent(ownerId, task.id)
      marked.push({ id: updated?.id || task.id, title: updated?.title || task.title })
    }
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun: !args['mark-sent'],
        count: due?.length || 0,
        due,
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
