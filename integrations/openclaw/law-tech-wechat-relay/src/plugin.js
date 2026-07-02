import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry'
import { resolveLivePluginConfigObject } from 'openclaw/plugin-sdk/plugin-config-runtime'
import { handleHookMessage } from './index.js'
import { normalizeOpenClawHookMessage, shouldHandleWechatMessage } from './normalize-message.js'

const pendingByKey = new Map()
const RESULT_TTL_MS = 180_000
let latestPending = null

function relayLog(api, message, details = {}) {
  const logger = api.logger || api.log || console
  const safeDetails = {
    channel: details.channel,
    senderId: details.senderId ? `${String(details.senderId).slice(0, 8)}…` : undefined,
    messageId: details.messageId,
    ok: details.ok,
    hasReplyText: details.hasReplyText,
    reason: details.reason
  }
  const text = `[law-tech-wechat-relay] ${message} ${JSON.stringify(safeDetails)}`
  if (typeof logger.info === 'function') logger.info(text)
  else if (typeof logger.log === 'function') logger.log(text)
}

function makeKey(message) {
  return [
    message.channel || 'openclaw-weixin',
    message.senderId || 'unknown',
    message.messageId || message.command
  ].join(':')
}

function makeSoftKey(message) {
  return [
    message.channel || 'openclaw-weixin',
    message.senderId || 'unknown',
    message.command
  ].join(':')
}

function remember(message, promise) {
  const entry = {
    createdAt: Date.now(),
    message,
    promise
  }
  pendingByKey.set(makeKey(message), entry)
  pendingByKey.set(makeSoftKey(message), entry)
  latestPending = entry
  cleanup()
}

function findPending(message) {
  cleanup()
  const exact = pendingByKey.get(makeKey(message)) || pendingByKey.get(makeSoftKey(message))
  if (exact) return exact

  const now = Date.now()
  const latestMessage = latestPending?.message
  const channelMatches = latestMessage?.channel === message.channel
  const beforeReplyLacksMessageIdentity = !message.senderId || !message.messageId
  if (
    latestPending &&
    channelMatches &&
    beforeReplyLacksMessageIdentity &&
    now - latestPending.createdAt <= RESULT_TTL_MS
  ) {
    return latestPending
  }
  return null
}

function cleanup(now = Date.now()) {
  for (const [key, entry] of pendingByKey) {
    if (now - entry.createdAt > RESULT_TTL_MS) pendingByKey.delete(key)
  }
  if (latestPending && now - latestPending.createdAt > RESULT_TTL_MS) latestPending = null
}

function normalizeBeforeReplyMessage(event, ctx) {
  return normalizeOpenClawHookMessage({
    ...event,
    content: event.cleanedBody
  }, {
    ...ctx,
    channelId: ctx.messageProvider || ctx.channel || ctx.channelId
  })
}

export const lawTechWechatRelayPlugin = definePluginEntry({
  id: 'law-tech-wechat-relay',
  name: 'Law-Tech WeChat Relay',
  description: 'Forward WeChat ClawBot messages to Law-Tech and replace the agent reply with the real capture result.',
  register(api) {
    const getRelayConfig = () => {
      const liveConfig = resolveLivePluginConfigObject(
        api.runtime.config?.current ? () => api.runtime.config.current() : undefined,
        'law-tech-wechat-relay',
        api.pluginConfig && typeof api.pluginConfig === 'object' ? api.pluginConfig : undefined
      ) || {}
      return {
        captureUrl: liveConfig.captureUrl,
        token: liveConfig.token
      }
    }

    api.on('message_received', async (event, ctx) => {
      const message = normalizeOpenClawHookMessage(event, ctx)
      if (!shouldHandleWechatMessage(message)) {
        relayLog(api, 'skip message_received', {
          channel: message.channel,
          senderId: message.senderId,
          messageId: message.messageId,
          reason: 'not-wechat-or-empty'
        })
        return
      }
      relayLog(api, 'capture message_received', {
        channel: message.channel,
        senderId: message.senderId,
        messageId: message.messageId
      })
      const task = handleHookMessage(event, ctx, getRelayConfig()).catch(() => ({
        message,
        result: {
          ok: false,
          replyText: '这条内容尚未添加成功，请稍后重试。'
        }
      }))
      remember(message, task)
      const handled = await task
      relayLog(api, 'capture finished', {
        channel: message.channel,
        senderId: message.senderId,
        messageId: message.messageId,
        ok: handled?.result?.ok,
        hasReplyText: Boolean(handled?.result?.replyText)
      })
    })

    api.on('before_agent_reply', async (event, ctx) => {
      const message = normalizeBeforeReplyMessage(event, ctx)
      if (!shouldHandleWechatMessage(message)) {
        relayLog(api, 'skip before_agent_reply', {
          channel: message.channel,
          senderId: message.senderId,
          messageId: message.messageId,
          reason: 'not-wechat-or-empty'
        })
        return
      }

      const pending = findPending(message)
      const handled = pending ? await pending.promise : await handleHookMessage({
        ...event,
        content: event.cleanedBody
      }, {
        ...ctx,
        channelId: ctx.messageProvider || ctx.channel || ctx.channelId
      }, getRelayConfig())

      const replyText = handled?.result?.replyText || '这条内容尚未添加成功，请稍后重试。'
      relayLog(api, 'replace agent reply', {
        channel: message.channel,
        senderId: message.senderId,
        messageId: message.messageId,
        ok: handled?.result?.ok,
        hasReplyText: Boolean(replyText)
      })
      return {
        handled: true,
        reply: {
          text: replyText
        }
      }
    })
  }
})

export default lawTechWechatRelayPlugin
