import { normalizeOpenClawInput } from '@/lib/openclaw/inputNormalization'
import { runOpenClawAgent } from '@/lib/openclaw/agent/controller'
import {
  getOpenClawConversationState,
  saveOpenClawConversationState
} from '@/lib/server/openclawConversation'
import { ensureProfile } from '@/lib/server/supabase'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

export function readOpenClawBearerToken(req) {
  const authorization = String(req.headers.authorization || '')
  if (/^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '')
  }
  return String(req.query?.token || '')
}

export function authorizedOpenClawRequest(req) {
  const token = readOpenClawBearerToken(req)
  return Boolean(
    process.env.WECHAT_CAPTURE_TOKEN &&
    token === process.env.WECHAT_CAPTURE_TOKEN
  )
}

export function openClawOwnerUserId(senderId) {
  const allowedSender =
    process.env.WECHAT_ALLOWED_SENDER_ID?.trim()
  if (allowedSender && senderId !== allowedSender) return ''
  return (
    process.env.WECHAT_OWNER_USER_ID?.trim() ||
    process.env.SCHEDULE_OWNER_USER_ID?.trim() ||
    process.env.CLERK_ADMIN_USER_IDS?.split(',')[0]?.trim() ||
    ''
  )
}

function requestOrigin(req) {
  const configured = String(
    process.env.NEXT_PUBLIC_SITE_URL || ''
  ).replace(/\/$/, '')
  const host = String(
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    ''
  ).trim()
  const protocol = String(
    req.headers['x-forwarded-proto'] || 'https'
  ).split(',')[0].trim()
  if (host) return `${protocol}://${host}`
  return configured || 'https://law-tech.dev'
}

export function modelFirstOpenClawEnabled() {
  const configured = String(
    process.env.OPENCLAW_AGENT_V1_ENABLED || ''
  ).trim().toLowerCase()
  if (configured === 'false' || configured === '0') return false
  if (configured === 'true' || configured === '1') return true
  return process.env.NODE_ENV !== 'test'
}

export async function handleModelFirstOpenClawCommand(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    })
  }
  if (!authorizedOpenClawRequest(req)) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      replyText: '处理失败，请稍后重试。'
    })
  }

  const rawCommand = String(
    req.body?.command || req.body?.text || ''
  ).trim()
  const senderId = String(req.body?.senderId || '')
  const threadId = String(
    req.body?.threadId || senderId || 'default'
  )
  const messageId = String(
    req.body?.messageId ||
    req.body?.sourceMessageId ||
    ''
  )
  if (!rawCommand) {
    return res.status(400).json({
      ok: false,
      error: 'Empty command'
    })
  }

  const clerkUserId = openClawOwnerUserId(senderId)
  if (!clerkUserId) {
    return res.status(403).json({
      ok: false,
      error: 'SENDER_NOT_ALLOWED',
      replyText: '处理失败，请稍后重试。'
    })
  }

  try {
    const { profile } = await ensureProfile({
      clerkUserId,
      role: 'owner',
      status: 'active'
    })
    const conversationKey = {
      ownerId: profile.id,
      channel: 'openclaw-weixin',
      senderId,
      threadId
    }
    const now = req.body?.receivedAt
      ? new Date(String(req.body.receivedAt))
      : new Date()
    const safeNow = Number.isNaN(now.getTime())
      ? new Date()
      : now
    const normalized = normalizeOpenClawInput(rawCommand, {
      now: safeNow,
      timeZone: 'Asia/Shanghai'
    })
    const modelConfig = await resolveUserAiConfig(profile)
    const evaluationMode =
      req.body?.evaluationMode === 'router'
        ? 'router'
        : Boolean(req.body?.evaluationMode)
    const evaluationSession =
      evaluationMode === 'router' &&
      process.env.VERCEL_ENV !== 'production' &&
      req.body?.evaluationSession &&
      typeof req.body.evaluationSession === 'object'
        ? req.body.evaluationSession
        : null
    const result = await runOpenClawAgent({
      text: normalized.text,
      originalText: rawCommand,
      messageId,
      ownerId: profile.id,
      senderId,
      threadId,
      channel: 'openclaw-weixin',
      now: safeNow,
      timeZone: 'Asia/Shanghai',
      siteUrl: requestOrigin(req),
      modelConfig,
      evaluationMode,
      loadSession: async () => {
        if (evaluationSession) return evaluationSession
        const stored =
          await getOpenClawConversationState(conversationKey)
        return stored?.state || {}
      },
      saveSession: async (
        state,
        { lastMessageId, ttlMs } = {}
      ) => saveOpenClawConversationState(conversationKey, {
        state,
        lastMessageId,
        ttlMs
      })
    })

    return res
      .status(result.statusCode || 200)
      .json(result.body)
  } catch (error) {
    return res.status(error?.status || 502).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'AGENT_HANDLER_FAILED',
      replyText:
        '处理失败，本次没有确认成功的写入。'
    })
  }
}
