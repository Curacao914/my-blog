import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  deleteUserIntegration,
  getUserIntegration,
  publicIntegration,
  resolveUserAiConfig,
  upsertUserIntegration
} from '@/lib/server/userIntegrations'

const COST_MODES = new Set(['economy', 'standard', 'immediate'])
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

function cleanUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('API 地址必须使用 http 或 https')
  }
  return raw.replace(/\/$/, '')
}

function cleanModels(body = {}) {
  const model = key => String(body[key] || '').trim()
  return {
    defaultModel: model('defaultModel'),
    scheduleModel: model('scheduleModel'),
    outlineModel: model('outlineModel'),
    writerModel: model('writerModel'),
    reviewerModel: model('reviewerModel'),
    revisionModel: model('revisionModel'),
    finalReviewModel: model('finalReviewModel')
  }
}

function cleanPeakWindows(value) {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : ['09:00-12:00', '14:00-18:00']

  const windows = source.map(item => {
    if (typeof item === 'string') {
      const [start, end] = item.split('-').map(part => part.trim())
      if (!CLOCK.test(start) || !CLOCK.test(end)) return null
      return { start, end }
    }
    const start = String(item?.start || '').trim()
    const end = String(item?.end || '').trim()
    if (!CLOCK.test(start) || !CLOCK.test(end)) return null
    return { start, end }
  }).filter(Boolean)

  if (!windows.length) throw new Error('课程 AI 高峰时段格式无效')
  return windows
}

function cleanCostControl(body = {}) {
  const mode = String(body.courseCostMode || 'economy').trim()
  if (!COST_MODES.has(mode)) throw new Error('课程 AI 费用模式无效')

  const boundaryBufferMinutes = Math.min(
    60,
    Math.max(
      0,
      Math.round(Number(body.courseBoundaryBufferMinutes ?? 10))
    )
  )

  return {
    courseCostMode: mode,
    courseTimezone: 'Asia/Shanghai',
    coursePeakWindows: cleanPeakWindows(
      body.coursePeakWindows ||
      ['09:00-12:00', '14:00-18:00']
    ),
    courseBoundaryBufferMinutes: boundaryBufferMinutes
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
    if (req.method === 'GET') {
      const record = await getUserIntegration(
        auth.profile.id,
        'openai-compatible'
      )
      const resolved = await resolveUserAiConfig(auth.profile)
      return res.status(200).json({
        ok: true,
        integration: publicIntegration(record),
        effective: {
          configured: Boolean(
            resolved.apiKey &&
            Object.values(resolved.models || {}).some(Boolean)
          ),
          source: resolved.source,
          models: resolved.models || {},
          costControl: resolved.costControl || {}
        }
      })
    }

    if (req.method === 'PATCH') {
      const baseUrl = cleanUrl(
        req.body?.baseUrl || 'https://api.deepseek.com/v1'
      )
      const models = cleanModels(req.body || {})
      if (
        !models.defaultModel &&
        !models.scheduleModel &&
        !models.outlineModel
      ) {
        return res.status(400).json({
          ok: false,
          error: '至少填写一个默认模型或专项模型'
        })
      }

      const record = await upsertUserIntegration(
        auth.profile.id,
        'openai-compatible',
        {
          enabled: req.body?.enabled !== false,
          baseUrl,
          secret: req.body?.apiKey,
          clearSecret: Boolean(req.body?.clearApiKey),
          config: {
            ...models,
            ...cleanCostControl(req.body || {})
          }
        }
      )
      return res.status(200).json({
        ok: true,
        integration: publicIntegration(record)
      })
    }

    if (req.method === 'DELETE') {
      await deleteUserIntegration(
        auth.profile.id,
        'openai-compatible'
      )
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE')
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'AI settings failed'
    })
  }
}
