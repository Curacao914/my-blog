import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import {
  getCourseBriefReadState,
  setCourseBriefRead
} from '@/lib/server/courseBriefReads'

function compactBrief(entry = {}) {
  return {
    id: entry.id,
    type: entry.type,
    jobId: entry.jobId,
    lessonKey: entry.lessonKey,
    courseName: entry.courseName,
    teacher: entry.teacher,
    lessonTitle: entry.lessonTitle,
    title: entry.title,
    mainLine: entry.mainLine,
    markdown: entry.markdown,
    updatedAt: entry.updatedAt,
    fingerprint: entry.fingerprint,
    read: Boolean(entry.read),
    readAt: entry.readAt || '',
    url: entry.url,
    noteUrl: entry.noteUrl
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireCourseWorkspace(req)
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  const jobId = String(req.method === 'GET' ? req.query?.jobId : req.body?.jobId || '').trim()
  const lessonKey = String(req.method === 'GET' ? req.query?.lessonKey : req.body?.lessonKey || '').trim()
  if (!jobId || !lessonKey) {
    return res.status(400).json({
      ok: false,
      error: 'Course job id and lesson key are required'
    })
  }

  try {
    if (req.method === 'GET') {
      const state = await getCourseBriefReadState(
        auth.profile.id,
        jobId,
        lessonKey
      )
      if (!state.entry) {
        return res.status(200).json({
          ok: true,
          hasBrief: false,
          migrationMissing: state.migrationMissing
        })
      }
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({
        ok: true,
        hasBrief: true,
        migrationMissing: state.migrationMissing,
        brief: compactBrief(state.entry)
      })
    }

    const updated = await setCourseBriefRead({
      ownerId: auth.profile.id,
      jobId,
      lessonKey,
      read: req.body?.read !== false
    })
    return res.status(200).json({
      ok: true,
      hasBrief: true,
      brief: compactBrief(updated)
    })
  } catch (error) {
    const code = error?.code || error?.message
    if (code === 'COURSE_BRIEF_READ_MIGRATION_REQUIRED') {
      return res.status(503).json({
        ok: false,
        code,
        error: 'Course brief read-state migration is required'
      })
    }
    const message = error instanceof Error
      ? error.message
      : 'Course brief read-state request failed'
    return res.status(message === 'Course brief not found' ? 404 : 400).json({
      ok: false,
      error: message
    })
  }
}
