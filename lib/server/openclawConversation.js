import { supabaseRest } from '@/lib/server/supabase'

export const OPENCLAW_CONVERSATION_TTL_MS = 10 * 60 * 1000

function eq(value) {
  return `eq.${encodeURIComponent(String(value || ''))}`
}

function isMissingTable(error) {
  return error?.data?.code === '42P01' || /openclaw_conversation_states.*does not exist/i.test(error?.message || '')
}

function keyParts({ ownerId, channel = 'openclaw-weixin', senderId = '', threadId = '' }) {
  return {
    ownerId,
    channel: String(channel || 'openclaw-weixin'),
    senderId: String(senderId || ''),
    threadId: String(threadId || senderId || 'default')
  }
}

export async function getOpenClawConversationState(key) {
  const parts = keyParts(key)
  if (!parts.ownerId) return null
  try {
    const rows = await supabaseRest(
      `/openclaw_conversation_states?select=id,owner_id,channel,sender_id,thread_id,state,last_message_id,expires_at,updated_at` +
      `&owner_id=${eq(parts.ownerId)}` +
      `&channel=${eq(parts.channel)}` +
      `&sender_id=${eq(parts.senderId)}` +
      `&thread_id=${eq(parts.threadId)}` +
      `&expires_at=gt.${encodeURIComponent(new Date().toISOString())}` +
      '&limit=1'
    )
    return rows?.[0] || null
  } catch (error) {
    if (isMissingTable(error)) return null
    throw error
  }
}

export async function saveOpenClawConversationState(key, {
  state = {},
  lastMessageId = '',
  ttlMs = OPENCLAW_CONVERSATION_TTL_MS
} = {}) {
  const parts = keyParts(key)
  if (!parts.ownerId) return null
  const now = new Date()
  const expiresAt = new Date(now.getTime() + Math.max(60_000, Number(ttlMs) || OPENCLAW_CONVERSATION_TTL_MS))
  try {
    const rows = await supabaseRest(
      '/openclaw_conversation_states?on_conflict=owner_id,channel,sender_id,thread_id' +
      '&select=id,owner_id,channel,sender_id,thread_id,state,last_message_id,expires_at,updated_at',
      {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          owner_id: parts.ownerId,
          channel: parts.channel,
          sender_id: parts.senderId,
          thread_id: parts.threadId,
          state,
          last_message_id: lastMessageId || null,
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString()
        })
      }
    )
    return rows?.[0] || null
  } catch (error) {
    if (isMissingTable(error)) return null
    throw error
  }
}

export async function clearOpenClawConversationState(key) {
  const parts = keyParts(key)
  if (!parts.ownerId) return false
  try {
    await supabaseRest(
      `/openclaw_conversation_states?owner_id=${eq(parts.ownerId)}` +
      `&channel=${eq(parts.channel)}` +
      `&sender_id=${eq(parts.senderId)}` +
      `&thread_id=${eq(parts.threadId)}`,
      { method: 'DELETE' }
    )
    return true
  } catch (error) {
    if (isMissingTable(error)) return false
    throw error
  }
}
