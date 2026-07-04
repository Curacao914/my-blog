import {
  authorizedOpenClawRequest,
  openClawOwnerUserId
} from '@/lib/server/openclawAgentHandler'
import { getOpenClawConversationState } from '@/lib/server/openclawConversation'
import { ensureProfile } from '@/lib/server/supabase'

function safeTrace(trace = {}) {
  return {
    traceId: trace.traceId || '',
    messageId: trace.messageId || '',
    input: trace.input || '',
    startedAt: trace.startedAt || '',
    finishedAt: trace.finishedAt || '',
    routePlan: trace.routePlan || null,
    capability: trace.capability || '',
    candidates: trace.candidates || [],
    policy: trace.policy || null,
    mutationSpecs: trace.mutationSpecs || [],
    toolResults: trace.toolResults || [],
    beforeAfter: trace.beforeAfter || [],
    response: trace.response || '',
    latencyMs: trace.latencyMs || 0,
    error: trace.error || ''
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    })
  }
  if (!authorizedOpenClawRequest(req)) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED'
    })
  }

  const senderId = String(req.query?.senderId || '')
  const threadId = String(
    req.query?.threadId || senderId || 'default'
  )
  const clerkUserId = openClawOwnerUserId(senderId)
  if (!clerkUserId) {
    return res.status(403).json({
      ok: false,
      error: 'SENDER_NOT_ALLOWED'
    })
  }

  try {
    const { profile } = await ensureProfile({
      clerkUserId,
      role: 'owner',
      status: 'active'
    })
    const stored = await getOpenClawConversationState({
      ownerId: profile.id,
      channel: 'openclaw-weixin',
      senderId,
      threadId
    })
    const traces = Array.isArray(stored?.state?.recentTraces)
      ? stored.state.recentTraces.map(safeTrace)
      : []
    return res.status(200).json({
      ok: true,
      traces
    })
  } catch (error) {
    return res.status(error?.status || 502).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'TRACE_READ_FAILED'
    })
  }
}
