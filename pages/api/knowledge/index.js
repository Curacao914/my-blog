import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  createKnowledgeEntry,
  listKnowledgeEntries
} from '@/lib/server/knowledgeRepository'

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

  try {
    if (req.method === 'GET') {
      const entries = await listKnowledgeEntries(auth.profile.id, req.query || {})
      return res.status(200).json({ entries })
    }

    if (req.method === 'POST') {
      const entry = await createKnowledgeEntry(auth.profile.id, req.body || {})
      return res.status(201).json({ entry })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'method_not_allowed'
    })
  } catch (error) {
    return sendError(res, error)
  }
}
