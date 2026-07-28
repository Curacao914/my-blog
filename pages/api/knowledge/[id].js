import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  getKnowledgeEntry,
  updateKnowledgeEntry
} from '@/lib/server/knowledgeRepository'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sendError(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500
  return res.status(status).json({
    error: error?.message || 'Knowledge request failed',
    code: error?.code || 'knowledge_request_failed'
  })
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      error: auth.error,
      code: auth.code
    })
  }

  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'method_not_allowed'
    })
  }

  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id
  if (!uuidPattern.test(id || '')) {
    return res.status(400).json({
      error: 'Invalid knowledge id',
      code: 'invalid_id'
    })
  }

  try {
    if (req.method === 'GET') {
      const entry = await getKnowledgeEntry(auth.profile.id, id)
      return res.status(200).json({ entry })
    }

    const entry = await updateKnowledgeEntry(auth.profile.id, id, req.body || {})
    return res.status(200).json({ entry })
  } catch (error) {
    return sendError(res, error)
  }
}
