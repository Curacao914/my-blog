import { fromDbScheduleItem, toDbScheduleItem } from '@/lib/domain/schedule'
import { selectRelevantItems } from '@/lib/domain/schedule-context'
import {
  ensureProfile,
  listScheduleRows,
  upsertScheduleRows
} from '@/lib/server/supabase'
import { POST as parseSchedulePost } from '@/pages/api/schedule/parse'
import { syncRemindersForScheduleItems } from '@/lib/server/reminders'

function readBearerToken(req) {
  const authHeader = req.headers.authorization || ''
  if (/^Bearer\s+/i.test(authHeader)) return authHeader.replace(/^Bearer\s+/i, '')
  return req.query?.token || ''
}

function isWechatSource(source) {
  return source === 'wechat-clawbot' || source === 'openclaw-wechat' || source === 'wechat'
}

function isAuthorized(req, source) {
  const token = readBearerToken(req)
  if (isWechatSource(source)) {
    return Boolean(process.env.WECHAT_CAPTURE_TOKEN && token === process.env.WECHAT_CAPTURE_TOKEN)
  }
  return Boolean(process.env.TASK_CAPTURE_TOKEN && token === process.env.TASK_CAPTURE_TOKEN)
}

function ownerUserIdFor(source, senderId) {
  if (isWechatSource(source)) {
    const allowedSender = process.env.WECHAT_ALLOWED_SENDER_ID?.trim()
    if (allowedSender && senderId !== allowedSender) return ''
    return (
      process.env.WECHAT_OWNER_USER_ID?.trim() ||
      process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
      process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
      ''
    )
  }
  return (
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    'local-dev'
  )
}

async function parseCommand(command, items) {
  const request = new Request('http://law-tech.local/api/schedule/parse', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command, items })
  })
  const response = await parseSchedulePost(request)
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data?.error || 'parse failed')
    error.status = response.status
    throw error
  }
  return data
}

function formatItemSummary(item) {
  const title = item.title || '未命名事项'
  const isReading = item.date === 'reading' || item.sectionKey === 'reading' || item.section === '阅读'
  const date = item.date && item.date !== 'none' && item.date !== 'reading' ? item.date : ''
  const when = [date, item.time].filter(Boolean).join(' ')

  if (item.status === 'done') {
    return {
      type: isReading ? 'reading' : 'schedule',
      title,
      replyText: isReading ? `已标记读完：《${title}》` : `已完成：${title}`
    }
  }

  if (item.status === 'cancelled') {
    return {
      type: isReading ? 'reading' : 'schedule',
      title,
      replyText: isReading ? `已取消阅读：《${title}》` : `已取消：${title}`
    }
  }

  if (isReading) {
    return {
      type: 'reading',
      title,
      replyText: `已保存到阅读：《${title}》${when ? `\n时间：${when}` : '\n未设置阅读时间'}`
    }
  }

  return {
    type: 'schedule',
    title,
    replyText: `已添加日程：${title}${when ? `\n时间：${when}` : ''}`
  }
}

function formatReply(parsed, savedRows) {
  const first = parsed.items?.[0] || {}
  const summary = formatItemSummary(first)
  const action = parsed.mode === 'replace' ? 'updated' : 'created'
  return {
    ok: true,
    action,
    type: summary.type,
    recordId: savedRows[0]?.id || null,
    title: summary.title,
    scheduledAt: null,
    replyText:
      action === 'updated'
        ? summary.replyText
            .replace(/^已添加日程：/, '已修改：')
            .replace(/^已保存到阅读：/, '已修改：')
        : summary.replyText
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const source = req.body?.source || 'capture'
  const senderId = req.body?.senderId || ''
  if (!isAuthorized(req, source)) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      replyText: '这条内容尚未添加成功，请稍后重试。'
    })
  }

  const clerkUserId = ownerUserIdFor(source, senderId)
  if (!clerkUserId) {
    return res.status(500).json({
      ok: false,
      error: 'No owner configured',
      replyText: '这条内容尚未添加成功，请稍后重试。'
    })
  }

  const command = req.body?.command || req.body?.text || ''
  if (!command.trim()) {
    return res.status(400).json({ ok: false, error: 'Empty command' })
  }

  try {
    const { profile } = await ensureProfile({ clerkUserId })
    const existingRows = await listScheduleRows(profile.id)
    const currentItems = (existingRows || []).map(fromDbScheduleItem)
    const contextItems = selectRelevantItems(command, currentItems)
    const parsed = await parseCommand(command, contextItems)

    if (!Array.isArray(parsed.items) || !parsed.items.length) {
      return res.status(422).json({
        ok: false,
        error: 'EMPTY_RESULT',
        replyText: '这条内容尚未添加成功，请稍后重试。'
      })
    }

    const rows = parsed.items.map(item =>
      toDbScheduleItem({ ...item, source }, profile.id)
    )
    const savedRows = await upsertScheduleRows(rows)
    await syncRemindersForScheduleItems({
      ownerId: profile.id,
      items: (savedRows || []).map(fromDbScheduleItem)
    })
    const allRows = await listScheduleRows(profile.id)
    const result = formatReply(parsed, savedRows || rows)

    return res.status(200).json({
      ...result,
      items: (allRows || []).map(fromDbScheduleItem)
    })
  } catch (error) {
    return res.status(error.status || 502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'PROCESSING_FAILED',
      replyText: '这条内容尚未添加成功，请稍后重试。'
    })
  }
}
