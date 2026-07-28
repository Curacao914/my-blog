import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  createKnowledgeRelation,
  listKnowledgeRelations,
  refreshKnowledgeSuggestions,
  updateKnowledgeRelation
} from '@/lib/server/knowledgeRelations'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sendError(res, error) {
  if (error?.isKnowledgeRepositoryError) {
    return res.status(error.status).json({ error: error.message, code: error.code })
  }
  console.error('Knowledge relations API failed', 'Unexpected relation error')
  return res.status(500).json({ error: '轻知识关联暂时不可用', code: 'relations_unavailable' })
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error, code: auth.code })
  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id
  if (!uuidPattern.test(id || '')) return res.status(400).json({ error: '无效的内容编号', code: 'invalid_id' })

  try {
    if (req.method === 'GET') {
      if (req.query?.refresh !== 'false') await refreshKnowledgeSuggestions(auth.profile.id, id)
      return res.status(200).json({ relations: await listKnowledgeRelations(auth.profile.id, id) })
    }
    if (req.method === 'POST') {
      const relation = await createKnowledgeRelation(auth.profile.id, id, req.body || {})
      return res.status(201).json({ relation })
    }
    if (req.method === 'PATCH') {
      const relation = await updateKnowledgeRelation(
        auth.profile.id,
        id,
        req.body?.relationId,
        req.body?.status
      )
      return res.status(200).json({ relation })
    }
    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' })
  } catch (error) {
    return sendError(res, error)
  }
}
