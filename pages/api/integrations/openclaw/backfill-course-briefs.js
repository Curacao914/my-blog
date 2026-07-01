import { hasValidCaptureToken } from '@/lib/auth/serverAdmin'
import { ensureCourseBriefForJob } from '@/lib/course/runBatch'
import {
  listTextPackCourseJobs,
  workflowFromJob
} from '@/lib/courseRepository'
import { resolveOpenClawOwnerProfile } from '@/lib/server/openclawRuntime'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!hasValidCaptureToken(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  }

  try {
    const profile = await resolveOpenClawOwnerProfile()
    const modelConfig = await resolveUserAiConfig(profile)
    if (!modelConfig?.apiKey) {
      return res.status(409).json({
        ok: false,
        error: '请先在“模型与 API”中保存可用的个人 DeepSeek 配置'
      })
    }

    const limit = Math.min(
      3,
      Math.max(1, Number(req.body?.limit || 2))
    )
    const jobs = await listTextPackCourseJobs(profile.id, 60)
    const candidates = []
    for (const job of jobs || []) {
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
              courseName:
                workflow.courseSpec?.courseName ||
                job.course_name
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
          modelConfig,
          {
            ownerId: profile.id,
            lessonKey: candidate.lesson.key,
            force: true
          }
        )
        results.push({
          jobId: candidate.job.id,
          lessonKey: candidate.lesson.key,
          courseName: candidate.courseName,
          lessonTitle: candidate.lesson.title,
          status: result.created
            ? '已生成'
            : result.reason || '已存在'
        })
      } catch (error) {
        results.push({
          jobId: candidate.job.id,
          lessonKey: candidate.lesson.key,
          courseName: candidate.courseName,
          lessonTitle: candidate.lesson.title,
          status: error instanceof Error
            ? error.message
            : '生成失败'
        })
      }
    }

    return res.status(200).json({
      ok: true,
      completed: results.filter(
        item => item.status === '已生成'
      ).length,
      remaining: Math.max(
        0,
        candidates.length - selected.length
      ),
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
