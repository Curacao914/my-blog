import crypto from 'crypto'

import { encryptUserSecret } from '@/lib/server/secretCrypto'
import { supabaseRest } from '@/lib/server/supabase'

function encryptedColumns(prefix, value) {
  const encrypted = encryptUserSecret(String(value || ''))
  return {
    [`${prefix}_ciphertext`]: encrypted.ciphertext,
    [`${prefix}_iv`]: encrypted.iv,
    [`${prefix}_tag`]: encrypted.tag
  }
}

function identifierHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

export async function saveOpenClawAgentShadowTrace(trace) {
  const rows = await supabaseRest('/openclaw_agent_shadow_traces?on_conflict=owner_id,channel,message_hash,config_id&select=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      owner_id: trace.ownerId,
      channel: trace.channel,
      sender_hash: identifierHash(trace.senderId),
      thread_hash: identifierHash(trace.threadId),
      message_hash: identifierHash(trace.messageId),
      config_id: trace.configId,
      config_version: trace.configVersion,
      ...encryptedColumns('message', trace.message),
      ...encryptedColumns('legacy_reply', trace.legacyReply),
      intent: trace.intent || null,
      plan: trace.plan || null,
      resolution: trace.resolution || null,
      gate: trace.gate || null,
      candidate_summary: trace.candidateSummary || [],
      differences: trace.differences || {},
      usage: trace.usage || {},
      model: trace.model || null,
      estimated_usd: Number(trace.estimatedUsd || 0),
      latency_ms: Number(trace.latencyMs || 0),
      error_category: trace.errorCategory || null,
      error_detail: trace.errorDetail || null,
      expires_at: trace.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString()
    })
  })
  return rows?.[0] || null
}

export async function deleteExpiredOpenClawAgentShadowTraces(now = new Date()) {
  await supabaseRest(
    `/openclaw_agent_shadow_traces?expires_at=lt.${encodeURIComponent(now.toISOString())}`,
    { method: 'DELETE' }
  )
}
