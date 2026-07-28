import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { buildKnowledgePrompt } from '@/lib/knowledge/prompt'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const auth = await requireWorkspaceRequest(req, { permission: 'knowledge' })
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error, code: auth.code })

  const request = String(req.body?.request || '').trim().slice(0, 12000)
  if (!request) return res.status(400).json({ error: '请输入知识需求' })

  return res.status(200).json({
    prompt: buildKnowledgePrompt({ seedText: request })
  })
}
