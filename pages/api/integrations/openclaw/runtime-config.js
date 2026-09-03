import { hasValidCaptureToken } from '@/lib/auth/serverAdmin'
import {
  resolveOpenClawOwnerProfile,
  resolveOpenClawRuntimePreference
} from '@/lib/server/openclawRuntime'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!hasValidCaptureToken(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  }

  try {
    const profile = await resolveOpenClawOwnerProfile()
    const runtime = await resolveOpenClawRuntimePreference(profile)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({
      ok: true,
      ownerId: profile.id,
      ...runtime
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'OpenClaw runtime config failed'
    })
  }
}
