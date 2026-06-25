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

const allowedStatuses = new Set(['inbox', 'planned', 'waiting', 'done', 'archived'])
const allowedTypes = new Set([
  'course',
  'student-work',
  'life',
  'research',
  'writing',
  'admin'
])
const allowedPriorities = new Set(['low', 'normal', 'high'])

function extractLinks(rawText) {
  return Array.from(
    new Set(String(rawText).match(/https?:\/\/[^\s，。；、]+/g) || [])
  )
}

function extractFileRefs(rawText) {
  const text = String(rawText || '')
  const refs = []
  const pathMatches = text.match(
    /(?:\/Users\/[^\s，。；]+|(?:桌面|下载|文稿|Documents|Desktop|Downloads)\/[^\s，。；]+)/g
  )

  ;(pathMatches || []).forEach(match => {
    refs.push({ kind: 'path', value: match })
  })

  const labelledMatches = text.matchAll(
    /(?:材料|文件|资料|路径|位置)(?:在|是|：|:)?\s*([^，。；\n]+)/g
  )

  Array.from(labelledMatches).forEach(match => {
    const value = match[1]?.trim()
    if (value && !refs.some(ref => ref.value === value)) {
      refs.push({ kind: 'hint', value })
    }
  })

  return refs
}

function extractPlace(rawText) {
  const text = String(rawText || '')
  const match = text.match(/(?:地点|位置)(?:在|是|：|:)?\s*([^，。；\n]+)/)
  if (match?.[1]) return match[1].trim()

  const atMatch = text.match(/(?:在|到)(图书馆|教室|学院|办公室|法学院|宿舍|食堂|会议室)[^，。；\n]*/)
  return atMatch?.[0]?.replace(/^(在|到)/, '').trim() || null
}

function chineseNumberToInt(value) {
  const normalized = String(value || '').trim()
  const digits = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10
  }

  if (/^\d+$/.test(normalized)) return Number(normalized)
  if (normalized === '十') return 10
  if (normalized.startsWith('十')) return 10 + (digits[normalized[1]] || 0)
  if (normalized.endsWith('十')) return (digits[normalized[0]] || 0) * 10
  if (normalized.includes('十')) {
    const [left, right] = normalized.split('十')
    return (digits[left] || 1) * 10 + (digits[right] || 0)
  }

  return digits[normalized] ?? null
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function nextWeekday(targetDay) {
  const date = startOfToday()
  const currentDay = date.getDay()
  const diff = (targetDay - currentDay + 7) % 7 || 7
  date.setDate(date.getDate() + diff)
  return date
}

function inferDate(rawText) {
  const text = String(rawText || '')
  const date = startOfToday()

  if (/今天/.test(text)) return date
  if (/明天/.test(text)) {
    date.setDate(date.getDate() + 1)
    return date
  }
  if (/后天/.test(text)) {
    date.setDate(date.getDate() + 2)
    return date
  }

  const weekdayMatch = text.match(/(?:周|星期)([一二三四五六日天])/)
  if (weekdayMatch) {
    const dayMap = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }
    return nextWeekday(dayMap[weekdayMatch[1]])
  }

  const monthDayMatch = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/)
  if (monthDayMatch) {
    const parsed = startOfToday()
    parsed.setMonth(Number(monthDayMatch[1]) - 1, Number(monthDayMatch[2]))
    return parsed
  }

  const isoDateMatch = text.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoDateMatch) {
    const parsed = startOfToday()
    parsed.setFullYear(
      Number(isoDateMatch[1]),
      Number(isoDateMatch[2]) - 1,
      Number(isoDateMatch[3])
    )
    return parsed
  }

  return null
}

function inferTime(rawText) {
  const text = String(rawText || '')
  const timeMatch = text.match(
    /(凌晨|早上|上午|中午|下午|晚上)?\s*(\d{1,2}|[一二两三四五六七八九十]{1,3})\s*(?:点|:|：)\s*(\d{1,2}|半)?/
  )

  if (!timeMatch) return null

  let hour = chineseNumberToInt(timeMatch[2])
  if (hour === null) return null

  const period = timeMatch[1] || ''
  let minute = 0
  if (timeMatch[3] === '半') minute = 30
  else if (timeMatch[3]) minute = Number(timeMatch[3])

  if ((period === '下午' || period === '晚上') && hour < 12) hour += 12
  if (period === '中午' && hour < 11) hour += 12
  if (period === '凌晨' && hour === 12) hour = 0

  return { hour, minute }
}

function inferTaskDateTime(rawText) {
  const date = inferDate(rawText)
  if (!date) return null

  const time = inferTime(rawText)
  if (time) {
    date.setHours(time.hour, time.minute, 0, 0)
  } else {
    date.setHours(9, 0, 0, 0)
  }

  return date.toISOString()
}

function inferReminder(rawText, targetIso) {
  if (!targetIso || !/提醒|通知/.test(String(rawText || ''))) return null

  const target = new Date(targetIso)
  const advanceMatch = String(rawText || '').match(
    /提前\s*(\d+|[一二两三四五六七八九十]+)\s*(分钟|小时|天)/
  )

  if (advanceMatch) {
    const amount = chineseNumberToInt(advanceMatch[1])
    const unit = advanceMatch[2]

    if (amount) {
      if (unit === '分钟') target.setMinutes(target.getMinutes() - amount)
      if (unit === '小时') target.setHours(target.getHours() - amount)
      if (unit === '天') target.setDate(target.getDate() - amount)
    }
  }

  return target.toISOString()
}

function inferPriority(rawText) {
  if (/紧急|重要|高优先|deadline|ddl|urgent/i.test(rawText)) return 'high'
  if (/不急|低优先|有空|闲时/.test(rawText)) return 'low'
  return 'normal'
}

function inferType(rawText) {
  if (/课程|上课|课件|PPT|讲座|笔记/.test(rawText)) return 'course'
  if (/论文|写作|投稿|文章/.test(rawText)) return 'writing'
  if (/科研|文献|读书|资料/.test(rawText)) return 'research'
  if (/学生工作|班级|社团|会议/.test(rawText)) return 'student-work'
  if (/报销|手续|行政|申请/.test(rawText)) return 'admin'
  if (/生活|买|取|寄|快递|吃饭/.test(rawText)) return 'life'
  return null
}

function normalizeTaskContext(context = {}) {
  const source = String(context.source || 'web').trim() || 'web'
  const sourceUser = String(context.sourceUser || context.source_user || '').trim()
  const sourceMessageId = String(
    context.sourceMessageId || context.source_message_id || ''
  ).trim()
  const attachments = Array.isArray(context.attachments) ? context.attachments : []

  return {
    source,
    source_user: sourceUser || null,
    source_message_id: sourceMessageId || null,
    attachments
  }
}

function normalizeOptionalText(value) {
  const text = String(value || '').trim()
  return text || null
}

function normalizeOptionalIso(value, fieldName) {
  const text = String(value || '').trim()
  if (!text) return null
  const timestamp = Date.parse(text)
  if (Number.isNaN(timestamp)) {
    throw new Error(`${fieldName} must be an ISO-compatible date string`)
  }
  return new Date(timestamp).toISOString()
}

function normalizeTextArray(value, fieldName) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`)
  return value.map(item => String(item || '').trim()).filter(Boolean)
}

function normalizeJsonArray(value, fieldName) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array`)
  return value
}

function normalizeTaskPatch(patch = {}) {
  const payload = {
    updated_at: new Date().toISOString()
  }

  if ('title' in patch) {
    const title = String(patch.title || '').trim()
    if (!title) throw new Error('title cannot be empty')
    payload.title = title
  }

  if ('status' in patch) {
    const status = String(patch.status || '').trim()
    if (!allowedStatuses.has(status)) throw new Error('Invalid task status')
    payload.status = status
  }

  if ('type' in patch) {
    const type = normalizeOptionalText(patch.type)
    if (type && !allowedTypes.has(type)) throw new Error('Invalid task type')
    payload.type = type
  }

  if ('priority' in patch) {
    const priority = normalizeOptionalText(patch.priority)
    if (priority && !allowedPriorities.has(priority)) {
      throw new Error('Invalid task priority')
    }
    payload.priority = priority
  }

  if ('startsAt' in patch || 'starts_at' in patch) {
    payload.starts_at = normalizeOptionalIso(
      patch.startsAt || patch.starts_at,
      'startsAt'
    )
  }

  if ('dueAt' in patch || 'due_at' in patch) {
    payload.due_at = normalizeOptionalIso(patch.dueAt || patch.due_at, 'dueAt')
  }

  if ('remindAt' in patch || 'remind_at' in patch) {
    payload.remind_at = normalizeOptionalIso(
      patch.remindAt || patch.remind_at,
      'remindAt'
    )
  }

  if ('place' in patch) payload.place = normalizeOptionalText(patch.place)
  if ('notes' in patch) payload.notes = normalizeOptionalText(patch.notes)

  const links = normalizeTextArray(patch.links, 'links')
  if (links !== undefined) payload.links = links

  const fileRefs = normalizeJsonArray(patch.fileRefs || patch.file_refs, 'fileRefs')
  if (fileRefs !== undefined) payload.file_refs = fileRefs

  return payload
}

function makeTitle(rawText) {
  const firstLine = String(rawText || '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean)

  if (!firstLine) return ''
  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine
}

export function parseTaskCapture(rawText, context = {}) {
  const normalized = String(rawText || '').trim()
  if (!normalized) {
    throw new Error('rawText is required')
  }

  const targetIso = inferTaskDateTime(normalized)
  const reminderIso = inferReminder(normalized, targetIso)
  const normalizedContext = normalizeTaskContext(context)

  return {
    raw_text: normalized,
    title: makeTitle(normalized),
    status: 'inbox',
    type: inferType(normalized),
    priority: inferPriority(normalized),
    starts_at: targetIso,
    due_at: /ddl|deadline|截止|到期/i.test(normalized) ? targetIso : null,
    remind_at: reminderIso,
    place: extractPlace(normalized),
    links: extractLinks(normalized),
    file_refs: extractFileRefs(normalized),
    source: normalizedContext.source,
    source_user: normalizedContext.source_user,
    source_message_id: normalizedContext.source_message_id,
    attachments: normalizedContext.attachments,
    notes: normalized
  }
}

export async function createTaskFromCapture(rawText, context = {}) {
  const task = parseTaskCapture(rawText, context)
  const rows = await supabaseRequest('/tasks', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(task)
  })

  return rows?.[0] || null
}

export async function listRecentTasks(limit = 12) {
  return supabaseRequest(
    `/tasks?select=id,raw_text,title,status,type,priority,starts_at,due_at,remind_at,place,links,file_refs,source,source_user,source_message_id,attachments,reminder_sent_at,notes,created_at,updated_at&order=created_at.desc&limit=${limit}`
  )
}

export async function updateTask(taskId, patch = {}) {
  const id = String(taskId || '').trim()
  if (!id) throw new Error('taskId is required')

  const payload = normalizeTaskPatch(patch)
  const rows = await supabaseRequest(`/tasks?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  })

  return rows?.[0] || null
}
