import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { createOcrUploadToken, getOcrServiceUrl } from '@/lib/course/ocrSession'

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const serviceUrl = getOcrServiceUrl()
  if (!serviceUrl || !process.env.LAW_TECH_OCR_SIGNING_SECRET) {
    return res.status(503).json({ ok: false, error: '在线文字识别尚未配置' })
  }
  try {
    const maxBytes = Math.min(100 * 1024 * 1024, Math.max(1, Number(req.body?.maxBytes || 100 * 1024 * 1024)))
    const token = createOcrUploadToken({ subject: auth.userId || 'desk-user', maxBytes })
    return res.status(200).json({ ok: true, serviceUrl, token, maxBytes, expiresIn: 900 })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : '无法创建识别任务' })
  }
}
