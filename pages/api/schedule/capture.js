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
  const isReading = item.contentType === 'reading' || item.date === 'reading' || item.sectionKey === 'reading' || item.section === '阅读'
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

function captureKeyFor(req) {
  const headerKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key']
  if (headerKey) return String(headerKey)
  const source = req.body?.source || 'capture'
  const senderId = req.body?.senderId || ''
  const messageId = req.body?.messageId || req.body?.sourceMessageId || ''
  if (messageId) return `${source}:${senderId || 'unknown'}:${messageId}`
  return ''
}

function findExistingCapture(items, captureKey) {
  if (!captureKey) return null
  return items.find((item) => item.captureKey === captureKey || item.aiTrace?.captureKey === captureKey) || null
}

function hasExplicitModifyIntent(command = '') {
  return /修改|改到|改成|换到|延期|提前|完成|读完|取消|删掉|不用了|刚刚|刚才|上一条|上一个|这条|这篇|这个/.test(command)
}

function preventAccidentalReplace(parsed, command) {
  if (parsed.mode !== 'replace' || hasExplicitModifyIntent(command)) return parsed
  return {
    ...parsed,
    mode: 'append',
    items: (parsed.items || []).map(({ id, ...item }) => item)
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
      replyText: '保存失败，请稍后重试。'
    })
  }

  const clerkUserId = ownerUserIdFor(source, senderId)
  if (!clerkUserId) {
    return res.status(500).json({
      ok: false,
      error: 'No owner configured',
      replyText: '保存失败，请稍后重试。'
    })
  }

  const command = req.body?.command || req.body?.text || ''
  if (!command.trim()) {
    return res.status(400).json({ ok: false, error: 'Empty command' })
  }

  try {
    const { profile } = await ensureProfile({ clerkUserId, role: 'owner', status: 'active' })
    const existingRows = await listScheduleRows(profile.id)
    const currentItems = (existingRows || []).map(fromDbScheduleItem)
    const captureKey = captureKeyFor(req)
    const existingCapture = findExistingCapture(currentItems, captureKey)
    if (existingCapture) {
      return res.status(200).json({
        ok: true,
        action: 'duplicate',
        status: 'duplicate',
        type: existingCapture.contentType === 'reading' ? 'reading' : 'schedule',
        recordId: existingCapture.id,
        title: existingCapture.title,
        replyText:
          existingCapture.contentType === 'reading'
            ? `已保存到阅读：《${existingCapture.title}》`
            : `已添加日程：${existingCapture.title}`,
        items: currentItems
      })
    }
    const contextItems = selectRelevantItems(command, currentItems)
    const parsed = preventAccidentalReplace(await parseCommand(command, contextItems), command)

    if (!Array.isArray(parsed.items) || !parsed.items.length) {
      return res.status(200).json({
        ok: true,
        status: 'ignored',
        action: 'ignored',
        reason: parsed.reason || 'not_actionable',
        replyText: '未识别到需要保存的事项或阅读内容。',
        items: currentItems
      })
    }

    const rows = parsed.items.map(item =>
      toDbScheduleItem({ ...item, source, captureKey }, profile.id)
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
      replyText: '保存失败，请稍后重试。'
    })
  }
}
