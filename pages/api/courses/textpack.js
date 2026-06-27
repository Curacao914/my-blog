import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  deleteTextPackCourseJob,
  importCourseTextPack,
  listTextPackCourseJobs
} from '@/lib/courseRepository'
import { summarizeTextPack, validateTextPack } from '@/lib/course/textpack'
import { ensureProfile } from '@/lib/server/supabase'

async function getOwnerProfile(req) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error }
  }

  const { profile } = await ensureProfile({ clerkUserId: auth.userId || 'local-dev' })
  return { ok: true, ownerId: profile.id }
}

function cleanError(error) {
  return error instanceof Error ? error.message : 'Invalid course TextPack request'
}

export default async function handler(req, res) {
  const owner = await getOwnerProfile(req)
  if (!owner.ok) {
    return res.status(owner.status).json({ ok: false, error: owner.error })
  }

  try {
    if (req.method === 'GET') {
      const jobs = await listTextPackCourseJobs(owner.ownerId)
      return res.status(200).json({ ok: true, jobs })
    }

    if (req.method === 'POST') {
      const textPack = req.body?.textPack || req.body
      validateTextPack(textPack)
      const result = await importCourseTextPack(owner.ownerId, textPack)
      return res.status(result.existing ? 200 : 201).json({ ok: true, ...result })
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || req.body?.id || '').trim()
      if (!id) return res.status(400).json({ ok: false, error: 'Course job id is required' })
      await deleteTextPackCourseJob(owner.ownerId, id)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'PUT') {
      const textPack = req.body?.textPack || req.body
      const summary = summarizeTextPack(textPack)
      return res.status(200).json({ ok: true, summary })
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: cleanError(error)
    })
  }
}
