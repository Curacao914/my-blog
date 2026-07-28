import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { organizeKnowledgeLibrary } from '@/lib/server/knowledgeOrganizer'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error, code: auth.code })
  const itemId = String(req.body?.itemId || '').trim()
  if (!itemId) return res.status(400).json({ error: '无效的内容编号' })
  try {
    return res.status(200).json(
      await organizeKnowledgeLibrary(auth.profile, itemId)
    )
  } catch {
    return res.status(502).json({ error: '知识编排失败，内容已保存' })
  }
}
