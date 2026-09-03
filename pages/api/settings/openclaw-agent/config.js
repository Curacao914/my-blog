import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { buildAgentProfile } from '@/lib/openclaw/agent-v2/config'
import {
  agentStudioAuthorized,
  updateAgentConfigDraft
} from '@/lib/server/openclawAgentConfigs'

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, {
    permission: 'ai',
    ignoreImpersonation: true
  })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  if (!agentStudioAuthorized(auth)) {
    return res.status(403).json({ ok: false, error: 'Owner access required' })
  }
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!req.body?.expectedChecksum) {
    return res.status(400).json({ ok: false, error: 'expectedChecksum is required' })
  }
  try {
    const profile = buildAgentProfile(req.body?.profile || {})
    const config = await updateAgentConfigDraft({
      ownerId: auth.actorProfile.id,
      environment: req.body?.environment,
      configId: req.body?.configId,
      expectedChecksum: req.body?.expectedChecksum,
      profile
    })
    return res.status(200).json({ ok: true, config })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent config update failed'
    const status = /immutable|not found|forbidden|unsupported|must|required|environment|topology|risk/i
      .test(message) ? 400 : 500
    return res.status(status).json({ ok: false, error: message })
  }
}
