import { getSupabaseRestConfig } from '@/lib/db/client'

async function supabaseRequest(pathname, options = {}) {
  const { baseUrl, headers } = getSupabaseRestConfig()
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...headers,
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

export async function listDueTaskReminders(options = {}) {
  const now = options.now || new Date().toISOString()
  const limit = Number(options.limit || 20)
  const select = [
    'id',
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
    `/tasks?select=${select}&remind_at=lte.${encodeFilterValue(now)}&reminder_sent_at=is.null&status=not.in.(done,archived)&order=remind_at.asc&limit=${limit}`
  )
}

export async function markTaskReminderSent(taskId) {
  const rows = await supabaseRequest(`/tasks?id=eq.${encodeURIComponent(taskId)}`, {
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

export function buildTaskReminderMarkdown(tasks = []) {
  if (!tasks.length) return '当前没有到期提醒。'

  return [
    `# law-tech 事项提醒（${tasks.length}）`,
    '',
    ...tasks.map(formatTask),
    '',
    '> 这条消息来自 law-tech.dev 事项提醒队列。'
  ].join('\n')
}

export async function sendWecomTaskReminder(markdown) {
  const webhook = process.env.WECOM_BOT_WEBHOOK || process.env.TASK_WECOM_WEBHOOK
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

export async function dispatchTaskReminders(options = {}) {
  const due = await listDueTaskReminders({
    now: options.now,
    limit: options.limit
  })
  const markdown = buildTaskReminderMarkdown(due || [])
  const channel = options.channel || 'console'
  const shouldSend = Boolean(options.send)
  const shouldMark = shouldSend && options.mark !== false
  const sent = []
  const marked = []

  if (shouldSend && due?.length) {
    if (channel === 'wecom') {
      await sendWecomTaskReminder(markdown)
      sent.push({ channel, count: due.length })
    } else {
      throw new Error(`Unsupported send channel: ${channel}`)
    }

    if (shouldMark) {
      for (const task of due) {
        const updated = await markTaskReminderSent(task.id)
        marked.push({ id: updated?.id || task.id, title: updated?.title || task.title })
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    channel,
    dryRun: !shouldSend,
    count: due?.length || 0,
    markdown,
    due,
    sent,
    marked
  }
}
