import crypto from 'crypto'

import { getAdminCandidate, requireAdminRequest } from '@/lib/auth/serverAdmin'
import { supplementCourseTextPack } from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

async function ownerIdFor(req) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return auth
  const candidate = await getAdminCandidate(req)
  const { profile } = await ensureProfile({ clerkUserId: candidate.userId || 'local-dev' })
  return { ok: true, ownerId: profile.id }
}

export default async function handler(req, res) {
  const requestId = crypto.randomUUID()
  const owner = await ownerIdFor(req)
  if (!owner.ok) return res.status(owner.status).json({ ok: false, error: owner.error, stage: 'supplement-materials', requestId })
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed', stage: 'supplement-materials', requestId })
  }
  try {
    const jobId = String(req.query?.id || '').trim()
    const textPack = req.body?.textPack || req.body
    const result = await supplementCourseTextPack(owner.ownerId, jobId, textPack)
    return res.status(200).json({ ok: true, ...result, requestId })
  } catch (error) {
    const message = error instanceof Error ? error.message : '课程资料补充失败'
    return res.status(message === 'Course job not found' ? 404 : 400).json({ ok: false, error: message, stage: 'supplement-materials', requestId })
  }
}
