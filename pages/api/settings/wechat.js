import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  getWechatIntegration,
  publicWechatPreference
} from '@/lib/server/messageDeliveries'
import { upsertUserIntegration } from '@/lib/server/userIntegrations'

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
const DELIVERY = new Set(['immediate', 'scheduled'])

function cleanPreference(body = {}) {
  const dailyTime = String(body.dailyTime || '09:00').trim()
  const courseBriefTime = String(body.courseBriefTime || '20:30').trim()
  const courseBriefDelivery = String(body.courseBriefDelivery || 'scheduled').trim()
  if (!CLOCK.test(dailyTime) || !CLOCK.test(courseBriefTime)) {
    throw new Error('发送时间格式无效')
  }
  if (!DELIVERY.has(courseBriefDelivery)) {
    throw new Error('课程简报发送方式无效')
  }
  return {
    dailyScheduleEnabled: body.dailyScheduleEnabled !== false,
    dailyTime,
    courseBriefEnabled: body.courseBriefEnabled !== false,
    courseBriefDelivery,
    courseBriefTime,
    timezone: String(body.timezone || 'Asia/Shanghai').trim() || 'Asia/Shanghai'
  }
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'reminders' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  try {
    if (req.method === 'GET') {
      const record = await getWechatIntegration(auth.profile.id)
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({
        ok: true,
        preference: publicWechatPreference(record)
      })
    }

    if (req.method === 'PATCH') {
      const config = cleanPreference(req.body || {})
      const record = await upsertUserIntegration(
        auth.profile.id,
        'wechat-openclaw',
        {
          enabled: req.body?.enabled !== false,
          baseUrl: '',
          config
        }
      )
      return res.status(200).json({
        ok: true,
        preference: publicWechatPreference(record)
      })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : '微信设置保存失败'
    })
  }
}
