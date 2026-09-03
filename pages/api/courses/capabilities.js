import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

export default async function handler(req, res) {
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok: false, error: 'Method not allowed' }) }
  const ai = await resolveUserAiConfig(auth.profile)
  const models = ai.models || {}
  const required = ['outline', 'writer', 'reviewer', 'finalReview']
  const missing = []
  if (!ai.apiKey) missing.push('API Key')
  required.forEach(key => { if (!models[key]) missing.push(`${key} model`) })
  const ocrServiceUrl = String(process.env.OCR_SERVICE_URL || '').trim().replace(/\/$/, '')
  const onlineOcrConfigured = Boolean(ocrServiceUrl && process.env.LAW_TECH_OCR_SIGNING_SECRET)
  return res.status(200).json({
    ok: true,
    courseWriting: { configured: missing.length === 0, models, missing, source: ai.source },
    onlineOcr: { configured: onlineOcrConfigured, serviceUrl: onlineOcrConfigured ? ocrServiceUrl : '', missing: [!ocrServiceUrl ? 'OCR_SERVICE_URL' : '', !process.env.LAW_TECH_OCR_SIGNING_SECRET ? 'LAW_TECH_OCR_SIGNING_SECRET' : ''].filter(Boolean) },
    onlineProcessing: { configured: missing.length === 0 }
  })
}
