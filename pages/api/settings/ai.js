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
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('API 地址必须使用 http 或 https')
  }
  return raw.replace(/\/$/, '')
}

function provided(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key)
}

function cleanProviderConfig(body = {}, current = {}) {
  const value = key => provided(body, key)
    ? String(body[key] || '').trim()
    : String(current[key] || '').trim()
  const openclawModel =
    value('openclawModel') ||
    'deepseek/deepseek-v4-flash'
  if (!/^[a-z0-9._-]+\/[A-Za-z0-9._:/-]+$/.test(openclawModel)) {
    throw new Error('OpenClaw 模型格式无效')
  }
  return {
    ...current,
    defaultModel: value('defaultModel'),
    scheduleModel: value('scheduleModel'),
    openclawSyncEnabled: provided(body, 'openclawSyncEnabled')
      ? body.openclawSyncEnabled !== false
      : current.openclawSyncEnabled !== false,
    openclawModel
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
          costControl: resolved.costControl || {},
          automation: resolved.automation || {}
        }
      })
    }

    if (req.method === 'PATCH') {
      const existing = await getUserIntegration(
        auth.profile.id,
        'openai-compatible'
      )
      const baseUrl = cleanUrl(
        provided(req.body, 'baseUrl')
          ? req.body.baseUrl
          : existing?.base_url || 'https://api.deepseek.com/v1'
      )
      const config = cleanProviderConfig(
        req.body || {},
        existing?.config || {}
      )
      if (!config.defaultModel && !config.scheduleModel) {
        return res.status(400).json({
          ok: false,
          error: '至少填写一个默认模型或日程解析模型'
        })
      }

      const submittedApiKey = String(req.body?.apiKey || '').trim()
      const clearApiKey = Boolean(req.body?.clearApiKey)
      if (
        !submittedApiKey &&
        !existing?.secret_ciphertext &&
        !clearApiKey
      ) {
        return res.status(400).json({
          ok: false,
          error:
            '首次保存个人 AI 配置时必须填写 API Key；仅填写地址和模型不会创建可用配置',
          code: 'ai_api_key_required'
        })
      }

      const record = await upsertUserIntegration(
        auth.profile.id,
        'openai-compatible',
        {
          enabled: req.body?.enabled !== false,
          baseUrl,
          secret: submittedApiKey,
          clearSecret: clearApiKey,
          config
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
