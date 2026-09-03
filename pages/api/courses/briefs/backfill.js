import { requireCourseWorkspace } from '@/lib/auth/courseAccess'
import {
  listTextPackCourseJobs,
  workflowFromJob
} from '@/lib/courseRepository'
import { ensureCourseBriefForJob } from '@/lib/course/runBatch'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireCourseWorkspace(req, { ai: true })
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  try {
    const limit = Math.min(3, Math.max(1, Number(req.body?.limit || 2)))
    const jobs = await listTextPackCourseJobs(auth.profile.id, 60)
    const candidates = []
    for (const job of jobs) {
      try {
        const workflow = workflowFromJob(job)
        for (const lesson of workflow.lessons || []) {
          if (
            lesson.status === 'completed' &&
            lesson.finalNote?.markdown &&
            !lesson.brief?.markdown
          ) {
            candidates.push({
              job,
              lesson,
              courseName: workflow.courseSpec?.courseName || job.course_name
            })
          }
        }
      } catch {}
    }

    const selected = candidates.slice(0, limit)
    const results = []
    for (const candidate of selected) {
      try {
        const result = await ensureCourseBriefForJob(
          candidate.job.id,
          auth.modelConfig,
          {
            ownerId: auth.profile.id,
            lessonKey: candidate.lesson.key,
            force: true
          }
        )
        results.push({
          jobId: candidate.job.id,
          lessonKey: candidate.lesson.key,
          courseName: candidate.courseName,
          lessonTitle: candidate.lesson.title,
          status: result.created ? '已生成' : result.reason || '已存在'
        })
      } catch (error) {
        results.push({
          jobId: candidate.job.id,
          lessonKey: candidate.lesson.key,
          courseName: candidate.courseName,
          lessonTitle: candidate.lesson.title,
          status: error instanceof Error ? error.message : '生成失败'
        })
      }
    }

    return res.status(200).json({
      ok: true,
      completed: results.filter(item => item.status === '已生成').length,
      remaining: Math.max(0, candidates.length - selected.length),
      results
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : '历史课程简报补齐失败'
    })
  }
}
