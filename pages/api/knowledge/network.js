import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { getKnowledgeNetwork } from '@/lib/server/knowledgeNetwork'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error, code: auth.code })
  try {
    return res.status(200).json(await getKnowledgeNetwork(auth.profile.id))
  } catch {
    return res.status(500).json({ error: '知识网络读取失败' })
  }
}
