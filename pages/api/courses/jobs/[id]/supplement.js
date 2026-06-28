import crypto from 'crypto'

import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import { supplementCourseTextPack } from '@/lib/courseRepository'

export default async function handler(req, res) {
  const requestId = crypto.randomUUID()
  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code, stage: 'supplement-materials', requestId })
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Method not allowed', stage: 'supplement-materials', requestId }) }
  try {
    const result = await supplementCourseTextPack(auth.profile.id, String(req.query?.id || '').trim(), req.body?.textPack || req.body)
    return res.status(200).json({ ok: true, ...result, requestId })
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程资料补充失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message, stage: 'supplement-materials', requestId })
  }
}
