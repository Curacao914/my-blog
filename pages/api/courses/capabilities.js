import { requireAdminRequest } from '@/lib/auth/serverAdmin'

const model = (name, fallback = '') => String(process.env[name] || fallback || '').trim()

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const apiKey = process.env.COURSE_AI_API_KEY || process.env.SCHEDULE_AI_API_KEY || process.env.OPENAI_API_KEY
  const fallback = model('COURSE_AI_MODEL', process.env.SCHEDULE_AI_MODEL)
  const models = {
    outline: model('COURSE_OUTLINE_MODEL', fallback), writer: model('COURSE_WRITER_MODEL', fallback),
    reviewer: model('COURSE_REVIEWER_MODEL', fallback), revision: model('COURSE_REVISION_MODEL', model('COURSE_WRITER_MODEL', fallback)),
    finalReview: model('COURSE_FINAL_REVIEW_MODEL', fallback)
  }
  const missing = []
  if (!apiKey) missing.push('COURSE_AI_API_KEY')
  if (!models.outline) missing.push('COURSE_OUTLINE_MODEL 或 COURSE_AI_MODEL')
  if (!models.writer) missing.push('COURSE_WRITER_MODEL 或 COURSE_AI_MODEL')
  if (!models.reviewer) missing.push('COURSE_REVIEWER_MODEL 或 COURSE_AI_MODEL')
  if (!models.finalReview) missing.push('COURSE_FINAL_REVIEW_MODEL 或 COURSE_AI_MODEL')
  return res.status(200).json({ ok: true, courseWriting: { configured: missing.length === 0, models, missing }, localProcessing: { configured: Boolean(process.env.COURSE_WORKER_TOKEN), status: 'unknown' } })
}
