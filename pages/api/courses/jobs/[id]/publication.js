import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  getManagedContentBySource,
  saveCoursePublication,
  withdrawManagedContent
} from '@/lib/contentManagement'
import { buildCoursePublicationModel } from '@/lib/contentPublishingModel'
import { revalidatePublicContentSurfaces } from '@/lib/content/revalidation'
import {
  applyCourseWorkflowAction,
  getTextPackCourseJobForOwner,
  workflowFromJob
} from '@/lib/courseRepository'
import { ensureProfile } from '@/lib/server/supabase'

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    const { profile } = await ensureProfile({ clerkUserId: auth.userId || 'local-dev' })
    const jobId = String(req.query.id || '')
    const job = await getTextPackCourseJobForOwner(profile.id, jobId)
    const workflow = workflowFromJob(job)
    const lessonKey = String(
      req.method === 'GET' ? req.query.lesson || '' : req.body?.lessonKey || ''
    )
    const lesson = workflow.lessons?.find(item => item.key === lessonKey)
    if (!lesson) return res.status(404).json({ ok: false, error: 'Lesson not found' })

    const sourceId = `${jobId}:${lessonKey}`
    const existing = await getManagedContentBySource(sourceId)

    if (req.method === 'GET') {
      const defaults = buildCoursePublicationModel({
        jobId,
        workflow,
        lesson,
        existing
      })
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({
        ok: true,
        source: {
          jobId,
          lessonKey,
          courseName: workflow.courseSpec?.courseName || job.course_name || '',
          teacher: workflow.courseSpec?.teacher || job.teacher || '',
          lessonTitle: lesson.title || '',
          lessonOrder: lesson.order || 0,
          bodyMarkdown: lesson.finalNote?.markdown || '',
          completed: lesson.status === 'completed'
        },
        settings: existing?.settings || defaults.settings,
        publication: existing || lesson.publication || null
      })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const action = String(req.body?.action || 'draft')
    let publication

    if (action === 'withdraw') {
      if (!existing?.id) throw new Error('这份笔记还没有发布记录')
      publication = await withdrawManagedContent(existing.id)
    } else {
      publication = await saveCoursePublication({
        jobId,
        workflow,
        lessonKey,
        settings: req.body?.settings || {},
        publish: action === 'publish'
      })
    }

    const linked = await applyCourseWorkflowAction(profile.id, jobId, {
      type: 'set-lesson-publication',
      lessonKey,
      publication: {
        contentItemId: publication.id,
        slug: publication.slug,
        status: publication.status,
        version: publication.version,
        checksum: publication.checksum,
        syncedAt: new Date().toISOString(),
        stale: false
      }
    })

    await revalidatePublicContentSurfaces(res, publication.slug, 'course publication')
    return res.status(200).json({
      ok: true,
      publication,
      workflow: linked.workflow
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Course publication failed'
    })
  }
}
