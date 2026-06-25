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
    raw: { event, ctx }
  }
}

export function shouldHandleWechatMessage(message) {
  if (!message.command) return false
  if (message.channel && message.channel !== 'openclaw-weixin') return false
  return true
}
