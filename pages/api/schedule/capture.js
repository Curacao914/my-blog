import { fromDbScheduleItem, toDbScheduleItem } from '@/lib/domain/schedule'
import { selectRelevantItems } from '@/lib/domain/schedule-context'
import { applyResolvedScheduleCommand } from '@/lib/openclaw/scheduleCommandBridge'
import {
  ensureProfile,
  listScheduleRows,
  upsertScheduleRows
} from '@/lib/server/supabase'
import {
  runScheduleParse,
  shouldIgnoreCommand
} from '@/pages/api/schedule/parse'
import { syncRemindersForScheduleItems } from '@/lib/server/reminders'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

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

async function parseCommand(command, items, modelConfig) {
  const response = await runScheduleParse(
    { command, items },
    {
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.baseUrl,
      model:
        modelConfig.models?.schedule ||
        modelConfig.models?.default ||
        ''
    }
  )
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data?.error || 'parse failed')
    error.status = response.status
    throw error
  }
  return data
}

function formatShanghaiDateTime(value) {
  if (!value || value === 'none') return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`
}

function reminderLine(item) {
  const reminder = item.reminder || item.reminders?.[0]
  if (!reminder?.enabled || !reminder.remindAt) return ''
  const when = formatShanghaiDateTime(reminder.remindAt)
  const lead = Number(reminder.leadMinutes)
  const suffix = Number.isFinite(lead) && lead > 0 ? `（提前${lead}分钟）` : ''
  return `提醒：${reminder.channel === 'wechat' ? '微信' : reminder.channel || '提醒'}，${when}${suffix}`
}

function formatItemSummary(item) {
  const title = item.title || '未命名事项'
  const isReading = item.contentType === 'reading' || item.date === 'reading' || item.sectionKey === 'reading' || item.section === '阅读'
  const date = item.date && item.date !== 'none' && item.date !== 'reading' ? item.date : ''
  const when = [date, item.time].filter(Boolean).join(' ')
  const reminder = reminderLine(item)

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
      replyText: [
        `已保存到阅读：《${title}》${when ? `\n时间：${when}` : '\n未设置阅读时间'}`,
        reminder
      ].filter(Boolean).join('\n')
    }
  }

  return {
    type: 'schedule',
    title,
    replyText: [
      `已添加日程：${title}${when ? `\n时间：${when}` : ''}`,
      reminder
    ].filter(Boolean).join('\n')
  }
}

function formatReply(parsed, savedRows) {
  const savedItem = savedRows[0]?.owner_id ? fromDbScheduleItem(savedRows[0]) : (parsed.items?.[0] || {})
  const summary = formatItemSummary(savedItem)
  const action = parsed.mode === 'replace' ? 'updated' : 'created'
  return {
    ok: true,
    action,
    type: summary.type,
    recordId: savedRows[0]?.id || savedItem.id || null,
    title: summary.title,
    scheduledAt: savedItem.temporal?.startsAt || savedItem.temporal?.dueAt || null,
    item: savedItem,
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
  return /修改|改到|改成|换到|延期|延后|推迟|提前|完成|读完|取消|删掉|不用了|刚刚|刚才|上一条|上一个|这条|这篇|这个/.test(command)
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
  const originalCommand = req.body?.originalCommand || command
  if (!command.trim()) {
    return res.status(400).json({ ok: false, error: 'Empty command' })
  }
  if (shouldIgnoreCommand(originalCommand)) {
    return res.status(200).json({
      ok: true,
      status: 'ignored',
      action: 'ignored',
      reason: 'not_actionable',
      replyText: '未识别到需要保存的事项或阅读内容。',
      items: []
    })
  }

  try {
    const { profile } = await ensureProfile({ clerkUserId, role: 'owner', status: 'active' })
    const modelConfig = await resolveUserAiConfig(profile)
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
        item: existingCapture,
        replyText:
          existingCapture.contentType === 'reading'
            ? `已保存到阅读：《${existingCapture.title}》`
            : `已添加日程：${existingCapture.title}`,
        items: currentItems
      })
    }
    const contextItems = selectRelevantItems(command, currentItems)
    const modelParsed = await parseCommand(command, contextItems, modelConfig)
    const safeParsed = preventAccidentalReplace(modelParsed, originalCommand)
    const parsed = applyResolvedScheduleCommand(safeParsed, req.body?.resolvedCommand)

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
