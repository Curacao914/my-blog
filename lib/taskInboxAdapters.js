function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function stripCdata(value = '') {
  return String(value)
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim()
}

function readXmlTag(xml, tag) {
  const match = String(xml || '').match(
    new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
  )
  return match ? stripCdata(match[1]) : ''
}

function tryParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function parseUrlEncoded(text) {
  const params = new URLSearchParams(text)
  return Object.fromEntries(params.entries())
}

function normalizeChannel(channel) {
  const normalized = String(channel || 'external').toLowerCase()
  if (['wechat', 'weixin', 'wx'].includes(normalized)) return 'wechat'
  if (['wecom', 'work-wechat', 'qywx', 'enterprise-wechat'].includes(normalized)) {
    return 'wecom'
  }
  if (normalized === 'ios') return 'ios'
  return normalized.replace(/[^a-z0-9_-]+/g, '-') || 'external'
}

function textFromObject(payload = {}) {
  return firstString(
    payload.rawText,
    payload.raw_text,
    payload.text,
    payload.content,
    payload.Content,
    payload.msg,
    payload.message,
    payload?.text?.content,
    payload?.Text?.Content
  )
}

function attachmentsFromObject(payload = {}) {
  if (Array.isArray(payload.attachments)) return payload.attachments
  if (Array.isArray(payload.files)) return payload.files
  if (payload.picUrl || payload.PicUrl) {
    return [{ kind: 'image', url: payload.picUrl || payload.PicUrl }]
  }
  return []
}

export function parseIncomingTaskPayload({
  channel,
  contentType = '',
  rawBody = ''
}) {
  const normalizedChannel = normalizeChannel(channel)
  const raw = String(rawBody || '').trim()
  let payload = null

  if (contentType.includes('application/json')) {
    payload = tryParseJson(raw)
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    payload = parseUrlEncoded(raw)
  } else if (raw.startsWith('{')) {
    payload = tryParseJson(raw)
  }

  if (payload && typeof payload === 'object') {
    const text = textFromObject(payload)
    return {
      rawText: text,
      context: {
        source: normalizedChannel,
        sourceUser: firstString(
          payload.sourceUser,
          payload.source_user,
          payload.from,
          payload.FromUserName,
          payload.FromUserId,
          payload.user,
          payload.openid
        ),
        sourceMessageId: firstString(
          payload.sourceMessageId,
          payload.source_message_id,
          payload.MsgId,
          payload.msgId,
          payload.messageId
        ),
        attachments: attachmentsFromObject(payload)
      }
    }
  }

  if (raw.startsWith('<')) {
    return {
      rawText: firstString(readXmlTag(raw, 'Content'), readXmlTag(raw, 'Description')),
      context: {
        source: normalizedChannel,
        sourceUser: firstString(readXmlTag(raw, 'FromUserName'), readXmlTag(raw, 'FromUserId')),
        sourceMessageId: readXmlTag(raw, 'MsgId'),
        attachments: readXmlTag(raw, 'PicUrl')
          ? [{ kind: 'image', url: readXmlTag(raw, 'PicUrl') }]
          : []
      }
    }
  }

  return {
    rawText: raw,
    context: {
      source: normalizedChannel,
      sourceUser: '',
      sourceMessageId: '',
      attachments: []
    }
  }
}

export function toPublicTask(task) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    type: task.type,
    priority: task.priority,
    startsAt: task.starts_at,
    dueAt: task.due_at,
    remindAt: task.remind_at,
    place: task.place,
    links: task.links || [],
    fileRefs: task.file_refs || [],
    source: task.source || 'web',
    sourceUser: task.source_user || '',
    sourceMessageId: task.source_message_id || '',
    attachments: task.attachments || [],
    reminderSentAt: task.reminder_sent_at || null
  }
}
