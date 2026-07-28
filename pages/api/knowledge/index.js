import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  createKnowledgeEntry,
  listKnowledgeEntries
} from '@/lib/server/knowledgeRepository'

function sendError(res, error) {
  if (error?.isKnowledgeRepositoryError === true) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code
    })
  }
  console.error(
    'Knowledge collection API failed',
    'Unexpected repository error'
  )
  return res.status(500).json({
    error: '轻知识服务暂时不可用',
    code: 'knowledge_unavailable'
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
