import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  deleteUserIntegration,
  getUserIntegration,
  publicIntegration,
  resolveUserAiConfig,
  upsertUserIntegration
} from '@/lib/server/userIntegrations'

function cleanUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('API 地址必须使用 http 或 https')
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

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'ai' })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  try {
    if (req.method === 'GET') {
      const record = await getUserIntegration(auth.profile.id, 'openai-compatible')
      const resolved = await resolveUserAiConfig(auth.profile)
      return res.status(200).json({
        ok: true,
        integration: publicIntegration(record),
        effective: {
          configured: Boolean(resolved.apiKey && Object.values(resolved.models || {}).some(Boolean)),
          source: resolved.source,
          models: resolved.models || {}
        }
      })
    }

    if (req.method === 'PATCH') {
      const baseUrl = cleanUrl(req.body?.baseUrl || 'https://api.openai.com/v1')
      const models = cleanModels(req.body || {})
      if (!models.defaultModel && !models.scheduleModel && !models.outlineModel) {
        return res.status(400).json({ ok: false, error: '至少填写一个默认模型或专项模型' })
      }
      const record = await upsertUserIntegration(auth.profile.id, 'openai-compatible', {
        enabled: req.body?.enabled !== false,
        baseUrl,
        secret: req.body?.apiKey,
        clearSecret: Boolean(req.body?.clearApiKey),
        config: models
      })
      return res.status(200).json({ ok: true, integration: publicIntegration(record) })
    }

    if (req.method === 'DELETE') {
      await deleteUserIntegration(auth.profile.id, 'openai-compatible')
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'AI settings failed' })
  }
}
