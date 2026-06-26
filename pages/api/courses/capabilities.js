import { requireAdminRequest } from '@/lib/auth/serverAdmin'

function modelName(envName, fallback = '') {
  return process.env[envName] || fallback || ''
}

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const hasKey = Boolean(process.env.COURSE_AI_API_KEY || process.env.SCHEDULE_AI_API_KEY || process.env.OPENAI_API_KEY)
  const defaultModel = modelName('COURSE_AI_MODEL', process.env.SCHEDULE_AI_MODEL)
  return res.status(200).json({
    ok: true,
    courseWriting: {
      configured: Boolean(hasKey && defaultModel),
      models: {
        outline: modelName('COURSE_OUTLINE_MODEL', defaultModel),
        writer: modelName('COURSE_WRITER_MODEL', defaultModel),
        reviewer: modelName('COURSE_REVIEWER_MODEL', defaultModel),
        revision: modelName('COURSE_REVISION_MODEL', defaultModel),
        finalReview: modelName('COURSE_FINAL_REVIEW_MODEL', defaultModel)
      }
    },
    localProcessing: {
      configured: Boolean(process.env.COURSE_WORKER_TOKEN),
      status: 'unknown'
    }
  })
}
