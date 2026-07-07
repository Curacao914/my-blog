import { requireOwnerRequest } from '@/lib/auth/serverAdmin'
import { updateAgentCommandRunDecision } from '@/lib/server/openclawAgentCommandRuns'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
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
    const run = await updateAgentCommandRunDecision(
      auth.profile.id,
      req.body?.runId,
      req.body?.decision,
      req.body?.note || ''
    )
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({
      ok: true,
      run,
      previewOnly: true,
      executionAllowed: false,
      writesPerformed: false,
      toolExecuted: false
    })
  } catch (error) {
    return res.status(error?.status || 500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'AGENT_COMMAND_DECISION_FAILED',
      code: error?.code || 'AGENT_COMMAND_DECISION_FAILED',
      previewOnly: true,
      executionAllowed: false,
      writesPerformed: false,
      toolExecuted: false
    })
  }
}
