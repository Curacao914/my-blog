import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { buildAgentProfile } from '@/lib/openclaw/agent-v2/config'
import {
  agentStudioAuthorized,
  createAgentConfigDraft,
  listAgentConfigs
} from '@/lib/server/openclawAgentConfigs'
import { listEvaluationRuns } from '@/lib/server/openclawAgentEvaluations'

async function authorize(req, res) {
  const auth = await requireWorkspaceRequest(req, {
    permission: 'ai',
    ignoreImpersonation: true
  })
  if (!auth.ok) {
    res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
    return null
  }
  if (!agentStudioAuthorized(auth)) {
    res.status(403).json({ ok: false, error: 'Owner access required', code: 'owner_required' })
    return null
  }
  return auth
}

export default async function handler(req, res) {
  const auth = await authorize(req, res)
  if (!auth) return
  try {
    const environment = String(
      req.method === 'GET' ? req.query?.environment : req.body?.environment
    ) || 'preview'
    if (req.method === 'GET') {
      const [configs, evaluationRuns] = await Promise.all([
        listAgentConfigs({ ownerId: auth.actorProfile.id, environment }),
        listEvaluationRuns({ ownerId: auth.actorProfile.id, environment })
      ])
      return res.status(200).json({ ok: true, environment, configs, evaluationRuns })
    }
    if (req.method === 'POST') {
      const profile = buildAgentProfile(req.body?.profile || {})
      const config = await createAgentConfigDraft({
        ownerId: auth.actorProfile.id,
        environment,
        profile,
        parentConfigId: req.body?.parentConfigId || null
      })
      return res.status(201).json({ ok: true, config })
    }
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent Studio failed'
    const status = /forbidden|unsupported|must|required|environment|topology|risk|confirmation/i
      .test(message) ? 400 : 500
    return res.status(status).json({ ok: false, error: message })
  }
}
