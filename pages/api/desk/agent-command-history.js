import { requireOwnerRequest } from '@/lib/auth/serverAdmin'
import { listAgentCommandRuns } from '@/lib/server/openclawAgentCommandRuns'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireOwnerRequest(req)
  if (!auth.ok) {
    return res.status(auth.status || 401).json({
      ok: false,
      error: auth.error || 'Unauthorized',
      code: auth.code || 'UNAUTHORIZED'
    })
  }

  try {
    const runs = await listAgentCommandRuns(auth.profile.id, {
      environment: req.query.environment,
      limit: req.query.limit
    })
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ ok: true, runs })
  } catch (error) {
    return res.status(error?.status || 500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'AGENT_COMMAND_HISTORY_FAILED'
    })
  }
}
