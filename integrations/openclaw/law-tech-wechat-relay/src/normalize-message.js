function messageDirection(envelope = {}, context = {}) {
  const metadata = envelope.metadata || {}
  const raw = String(
    context.direction ||
    envelope.direction ||
    metadata.direction ||
    envelope.message?.direction ||
    ''
  ).toLowerCase()
  if (['outbound', 'outgoing', 'sent'].includes(raw)) return 'outbound'
  if (['inbound', 'incoming', 'received'].includes(raw)) return 'inbound'
  return ''
}

function messageRole(envelope = {}, context = {}) {
  return String(
    context.role ||
    envelope.role ||
    envelope.authorRole ||
    envelope.senderRole ||
    envelope.metadata?.role ||
    envelope.message?.role ||
    ''
  ).toLowerCase()
}

function truthyFlag(value) {
  if (value === true || value === 1) return true
  if (typeof value !== 'string') return false
  return ['true', '1', 'yes'].includes(value.trim().toLowerCase())
}

function messageFromSelf(envelope = {}, context = {}) {
  return [
    context.fromMe,
    context.isFromMe,
    context.outbound,
    envelope.fromMe,
    envelope.isFromMe,
    envelope.outbound,
    envelope.sentBySelf,
    envelope.metadata?.fromMe,
    envelope.metadata?.isFromMe,
    envelope.metadata?.outbound,
    envelope.message?.fromMe,
    envelope.message?.isFromMe
  ].some(truthyFlag)
}

export function normalizeWechatMessage(envelope = {}) {
  const channel = envelope.channel || envelope.channelId || envelope.metadata?.channel || envelope.metadata?.channelId
  const text =
    envelope.text ||
    envelope.body ||
    envelope.BodyForAgent ||
    envelope.bodyForAgent ||
    envelope.message?.text ||
    envelope.message?.body ||
    envelope.message?.content ||
    ''

  const senderId =
    envelope.senderId ||
    envelope.from ||
    envelope.sender?.id ||
    envelope.message?.senderId ||
    envelope.metadata?.senderId ||
    ''

  const messageId =
    envelope.messageId ||
    envelope.id ||
    envelope.message?.id ||
    envelope.metadata?.messageId ||
    ''

  const threadId =
    envelope.threadId ||
    envelope.conversationId ||
    envelope.message?.threadId ||
    envelope.metadata?.threadId ||
    ''

  return {
    channel,
    command: String(text || '').trim(),
    senderId: String(senderId || ''),
    messageId: String(messageId || ''),
    threadId: String(threadId || ''),
    direction: messageDirection(envelope),
    role: messageRole(envelope),
    fromSelf: messageFromSelf(envelope),
    raw: envelope
  }
}

export function normalizeOpenClawHookMessage(event = {}, ctx = {}) {
  const channel = ctx.channelId || event.channel || event.metadata?.channel || event.metadata?.originatingChannel
  const command = event.content || event.body || event.bodyForAgent || event.cleanedBody || ''
  const senderId = ctx.senderId || event.senderId || event.metadata?.senderId || event.from || ''
  const messageId = ctx.messageId || event.messageId || event.metadata?.messageId || ''
  const threadId = event.threadId || event.metadata?.threadId || ctx.conversationId || ''

  return {
    channel,
    command: String(command || '').trim(),
    senderId: String(senderId || ''),
    messageId: String(messageId || ''),
    threadId: String(threadId || ''),
    direction: messageDirection(event, ctx),
    role: messageRole(event, ctx),
    fromSelf: messageFromSelf(event, ctx),
    raw: { event, ctx }
  }
}

export function shouldHandleWechatMessage(message) {
  if (!message.command) return false
  if (message.fromSelf || message.direction === 'outbound') return false
  if (['assistant', 'system', 'bot'].includes(String(message.role || '').toLowerCase())) {
    return false
  }
  const channel = String(message.channel || '').toLowerCase()
  if (!channel) return true
  if (channel === 'openclaw-weixin') return true
  if (channel.includes('weixin') || channel.includes('wechat')) return true
  return false
}
