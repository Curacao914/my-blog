import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  agentStudioAuthorized,
  publishAgentConfig
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const { environment, configId, evaluationRunId } = req.body || {}
  if (!environment || !configId || !evaluationRunId) {
    return res.status(400).json({
      ok: false,
      error: 'environment, configId and evaluationRunId are required'
    })
  }
  try {
    const config = await publishAgentConfig({
      ownerId: auth.actorProfile.id,
      environment,
      configId,
      evaluationRunId
    })
    return res.status(200).json({ ok: true, config })
  } catch (error) {
    return res.status(409).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Agent config publish failed'
    })
  }
}
