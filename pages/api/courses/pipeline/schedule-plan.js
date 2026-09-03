import { requireCoursePipelineAccess } from '@/lib/auth/coursePipelineAccess'
import { courseAutomationPlan } from '@/lib/course/automationSchedule'
import {
  getUserIntegration,
  upsertUserIntegration
} from '@/lib/server/userIntegrations'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireCoursePipelineAccess(req, { workerOnly: true })
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  try {
    const record = await getUserIntegration(
      auth.ownerId,
      'openai-compatible'
    )
    const config = record?.config || {}
    const action = String(req.body?.action || 'plan')

    if (action === 'ack') {
      const dateKey = String(req.body?.dateKey || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return res.status(400).json({ ok: false, error: 'Invalid dateKey' })
      }
      const updated = await upsertUserIntegration(
        auth.ownerId,
        'openai-compatible',
        {
          enabled: record?.enabled !== false,
          baseUrl: record?.base_url || 'https://api.deepseek.com/v1',
          config: {
            ...config,
            courseLastScheduledDate: dateKey,
            courseLastScheduledAt: new Date().toISOString()
          }
        }
      )
      return res.status(200).json({
        ok: true,
        acknowledged: true,
        dateKey,
        updatedAt: updated?.updated_at || null
      })
    }

    const trigger = String(req.body?.trigger || 'scheduled')
    const plan = courseAutomationPlan(config, {
      now: req.body?.now ? new Date(req.body.now) : new Date(),
      trigger
    })
    return res.status(200).json({ ok: true, plan })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Course schedule plan failed'
    })
  }
}
