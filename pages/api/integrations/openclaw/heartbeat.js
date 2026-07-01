import { hasValidCaptureToken } from '@/lib/auth/serverAdmin'
import { getWechatIntegration } from '@/lib/server/messageDeliveries'
import { resolveOpenClawOwnerProfile } from '@/lib/server/openclawRuntime'
import { upsertUserIntegration } from '@/lib/server/userIntegrations'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!hasValidCaptureToken(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  }

  try {
    const profile = await resolveOpenClawOwnerProfile()
    const current = await getWechatIntegration(profile.id)
    const now = new Date().toISOString()
    const record = await upsertUserIntegration(
      profile.id,
      'wechat-openclaw',
      {
        enabled: current?.enabled !== false,
        baseUrl: '',
        config: {
          ...(current?.config || {}),
          relayLastSeenAt: now,
          relayCurrentModel: String(req.body?.currentModel || '').trim(),
          relayWorkerId: String(req.body?.workerId || '').trim(),
          relayVersion: String(req.body?.version || '').trim()
        }
      }
    )
    return res.status(200).json({
      ok: true,
      lastSeenAt: record?.config?.relayLastSeenAt || now
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'OpenClaw heartbeat failed'
    })
  }
}
