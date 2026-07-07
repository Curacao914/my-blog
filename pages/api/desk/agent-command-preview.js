import { requireOwnerRequest } from '@/lib/auth/serverAdmin'
import { buildAgentCommandPreview } from '@/lib/openclaw/agent-v2/commandLane'
import { insertAgentCommandRun } from '@/lib/server/openclawAgentCommandRuns'

function statusFor(error) {
  return Number(error?.status || 500)
}

function publicError(error) {
  return {
    ok: false,
    error: error instanceof Error ? error.message : 'AGENT_COMMAND_PREVIEW_FAILED',
    code: error?.code || 'AGENT_COMMAND_PREVIEW_FAILED',
    previewOnly: true,
    executionAllowed: false,
    writesPerformed: false,
    toolExecuted: false
  }
}

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
    const preview = await buildAgentCommandPreview({
      ownerId: auth.profile.id,
      profile: auth.profile,
      text: req.body?.text || req.body?.command || '',
      environment: req.body?.environment,
      sessionState:
        req.body?.sessionState && typeof req.body.sessionState === 'object'
          ? req.body.sessionState
          : {},
      messageId: req.body?.messageId || ''
    })

    let run = null
    let persistence = { ok: true, warning: '' }
    try {
      run = await insertAgentCommandRun(auth.profile.id, preview)
    } catch (error) {
      persistence = {
        ok: false,
        warning:
          error instanceof Error
            ? error.message
            : 'Command preview persistence failed; apply the migration before final acceptance.'
      }
    }

    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({
      ...preview,
      runId: run?.id || null,
      run,
      persistence
    })
  } catch (error) {
    return res.status(statusFor(error)).json(publicError(error))
  }
}
