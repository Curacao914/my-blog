import { sendToLawTech } from './law-tech-client.js'
import { normalizeOpenClawHookMessage, normalizeWechatMessage, shouldHandleWechatMessage } from './normalize-message.js'

export async function handleWechatInbound(envelope, config = {}) {
  const message = normalizeWechatMessage(envelope)
  if (!shouldHandleWechatMessage(message)) {
    return {
      claimed: false
    }
  }

  const result = await sendToLawTech(message, config)
  return {
    claimed: true,
    stopAgent: true,
    replyText: result.replyText,
    ok: result.ok,
    payload: result.payload || null
  }
}

export async function handleHookMessage(event, ctx, config = {}) {
  const message = normalizeOpenClawHookMessage(event, ctx)
  if (!shouldHandleWechatMessage(message)) return null
  const result = await sendToLawTech(message, config)
  return {
    message,
    result
  }
}
