import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  getUserIntegration,
  upsertUserIntegration
} from '@/lib/server/userIntegrations'

const COST_MODES = new Set(['economy', 'standard', 'immediate'])
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

function cleanText(value) {
  return String(value || '').trim()
}

function publicConfig(record = {}) {
  const config = record?.config || {}
  return {
    enabled: config.courseAutomationEnabled !== false,
    briefEnabled: config.courseBriefGenerationEnabled !== false,
    scanTime: CLOCK.test(config.courseScanTime || '') ? config.courseScanTime : '02:00',
    courseCostMode: COST_MODES.has(config.courseCostMode)
      ? config.courseCostMode
      : 'economy',
    courseBoundaryBufferMinutes: Number(config.courseBoundaryBufferMinutes ?? 10),
    briefModel: config.briefModel || config.writerModel || config.defaultModel || 'deepseek-v4-pro',
    outlineModel: config.outlineModel || config.defaultModel || 'deepseek-v4-pro',
    writerModel: config.writerModel || config.defaultModel || 'deepseek-v4-pro',
    reviewerModel: config.reviewerModel || config.defaultModel || 'deepseek-v4-pro',
    revisionModel: config.revisionModel || config.writerModel || config.defaultModel || 'deepseek-v4-pro',
    finalReviewModel: config.finalReviewModel || config.defaultModel || 'deepseek-v4-pro',
    cleanupMedia: config.courseCleanupMedia !== false,
    autoApproveOutline: config.courseAutoApproveOutline !== false,
    updatedAt: record?.updated_at || null
  }
}

function cleanPatch(body = {}) {
  const mode = cleanText(body.courseCostMode || 'economy')
  if (!COST_MODES.has(mode)) throw new Error('课程费用模式无效')
  const scanTime = cleanText(body.scanTime || '02:00')
  if (!CLOCK.test(scanTime)) throw new Error('扫描时间格式无效')
  return {
    courseAutomationEnabled: body.enabled !== false,
    courseBriefGenerationEnabled: body.briefEnabled !== false,
    courseScanTime: scanTime,
    courseCostMode: mode,
    courseBoundaryBufferMinutes: Math.min(
      60,
      Math.max(0, Math.round(Number(body.courseBoundaryBufferMinutes ?? 10)))
    ),
    briefModel: cleanText(body.briefModel),
    outlineModel: cleanText(body.outlineModel),
    writerModel: cleanText(body.writerModel),
    reviewerModel: cleanText(body.reviewerModel),
    revisionModel: cleanText(body.revisionModel),
    finalReviewModel: cleanText(body.finalReviewModel),
    courseCleanupMedia: body.cleanupMedia !== false,
    courseAutoApproveOutline: body.autoApproveOutline !== false
  }
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'ai' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  try {
    const record = await getUserIntegration(
      auth.profile.id,
      'openai-compatible'
    )

    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        config: publicConfig(record)
      })
    }

    if (req.method === 'PATCH') {
      if (!record) {
        return res.status(400).json({
          ok: false,
          error: '请先在“模型与 API”中保存个人 DeepSeek 配置'
        })
      }
      const patch = cleanPatch(req.body || {})
      const updated = await upsertUserIntegration(
        auth.profile.id,
        'openai-compatible',
        {
          enabled: record.enabled !== false,
          baseUrl: record.base_url,
          config: {
            ...(record.config || {}),
            ...patch
          }
        }
      )
      return res.status(200).json({
        ok: true,
        config: publicConfig(updated)
      })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : '课程自动化设置失败'
    })
  }
}
