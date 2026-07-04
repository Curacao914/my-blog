import { decryptUserSecret, encryptUserSecret } from '@/lib/server/secretCrypto'
import { supabaseRest } from '@/lib/server/supabase'

const integrationSelect = 'id,owner_id,provider,enabled,base_url,secret_ciphertext,secret_iv,secret_tag,secret_hint,config,created_at,updated_at'

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

export async function getUserIntegration(ownerId, provider) {
  const rows = await supabaseRest(
    `/user_integrations?select=${integrationSelect}&owner_id=${eq(ownerId)}&provider=${eq(provider)}&limit=1`
  )
  return rows?.[0] || null
}

export async function upsertUserIntegration(ownerId, provider, input = {}) {
  const current = await getUserIntegration(ownerId, provider)
  const secret = String(input.secret || '').trim()
  const encrypted = secret ? encryptUserSecret(secret) : null
  const payload = {
    owner_id: ownerId,
    provider,
    enabled: input.enabled !== false,
    base_url: String(input.baseUrl || '').trim() || null,
    config: input.config && typeof input.config === 'object' ? input.config : {},
    updated_at: new Date().toISOString()
  }
  if (encrypted) {
    payload.secret_ciphertext = encrypted.ciphertext
    payload.secret_iv = encrypted.iv
    payload.secret_tag = encrypted.tag
    payload.secret_hint = encrypted.hint
  } else if (input.clearSecret) {
    payload.secret_ciphertext = null
    payload.secret_iv = null
    payload.secret_tag = null
    payload.secret_hint = null
  } else if (current) {
    payload.secret_ciphertext = current.secret_ciphertext
    payload.secret_iv = current.secret_iv
    payload.secret_tag = current.secret_tag
    payload.secret_hint = current.secret_hint
  }

  const rows = await supabaseRest(
    '/user_integrations?on_conflict=owner_id,provider&select=*',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(payload)
    }
  )
  return rows?.[0] || null
}

export async function deleteUserIntegration(ownerId, provider) {
  return supabaseRest(
    `/user_integrations?owner_id=${eq(ownerId)}&provider=${eq(provider)}`,
    { method: 'DELETE' }
  )
}

export function publicIntegration(record = {}) {
  return {
    configured: Boolean(record?.secret_ciphertext),
    enabled: record?.enabled !== false,
    baseUrl: record?.base_url || '',
    secretHint: record?.secret_hint || '',
    config: record?.config || {},
    updatedAt: record?.updated_at || null
  }
}

function ownerGlobalCostControl() {
  return {
    mode: process.env.COURSE_LLM_COST_MODE || 'economy',
    timezone: process.env.COURSE_LLM_TIMEZONE || 'Asia/Shanghai',
    peakWindows:
      process.env.COURSE_LLM_PEAK_WINDOWS ||
      '09:00-12:00,14:00-18:00',
    boundaryBufferMinutes: Number(
      process.env.COURSE_LLM_BOUNDARY_BUFFER_MINUTES || 10
    )
  }
}

function ownerGlobalAiConfig() {
  const apiKey =
    process.env.COURSE_AI_API_KEY ||
    process.env.SCHEDULE_AI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ''
  const baseUrl =
    process.env.COURSE_AI_BASE_URL ||
    process.env.SCHEDULE_AI_BASE_URL ||
    process.env.AI_BASE_URL ||
    'https://api.deepseek.com/v1'
  const fallback =
    process.env.COURSE_AI_MODEL ||
    process.env.SCHEDULE_AI_MODEL ||
    process.env.AI_MODEL ||
    'deepseek-v4-pro'

  return {
    apiKey,
    baseUrl: String(baseUrl).replace(/\/$/, ''),
    models: {
      default: fallback,
      router:
        process.env.OPENCLAW_ROUTER_MODEL ||
        process.env.SCHEDULE_AI_MODEL ||
        fallback,
      planner:
        process.env.OPENCLAW_PLANNER_MODEL ||
        process.env.OPENCLAW_ROUTER_MODEL ||
        fallback,
      responder:
        process.env.OPENCLAW_RESPONDER_MODEL ||
        process.env.OPENCLAW_ROUTER_MODEL ||
        fallback,
      schedule: process.env.SCHEDULE_AI_MODEL || fallback,
      brief: process.env.COURSE_BRIEF_MODEL || process.env.COURSE_WRITER_MODEL || fallback,
      outline: process.env.COURSE_OUTLINE_MODEL || fallback,
      writer: process.env.COURSE_WRITER_MODEL || fallback,
      reviewer: process.env.COURSE_REVIEWER_MODEL || fallback,
      revision:
        process.env.COURSE_REVISION_MODEL ||
        process.env.COURSE_WRITER_MODEL ||
        fallback,
      finalReview: process.env.COURSE_FINAL_REVIEW_MODEL || fallback
    },
    automation: {
      enabled: true,
      briefEnabled: true,
      scanTime: '02:00',
      cleanupMedia: true,
      autoApproveOutline: true
    },
    openclaw: {
      syncEnabled: true,
      model:
        process.env.OPENCLAW_DEFAULT_MODEL ||
        'deepseek/deepseek-v4-flash'
    },
    costControl: ownerGlobalCostControl(),
    source: 'environment'
  }
}

export async function resolveUserAiConfig(profile) {
  if (!profile?.id) throw new Error('Workspace profile is required')
  const record = await getUserIntegration(
    profile.id,
    'openai-compatible'
  )

  if (record?.enabled !== false && record?.secret_ciphertext) {
    const config = record.config || {}
    return {
      apiKey: decryptUserSecret(record),
      baseUrl: String(
        record.base_url || 'https://api.deepseek.com/v1'
      ).replace(/\/$/, ''),
      models: {
        default: config.defaultModel || 'deepseek-v4-pro',
        router:
          config.routerModel ||
          config.scheduleModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        planner:
          config.plannerModel ||
          config.routerModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        responder:
          config.responderModel ||
          config.routerModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        schedule:
          config.scheduleModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        brief:
          config.briefModel ||
          config.writerModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        outline:
          config.outlineModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        writer:
          config.writerModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        reviewer:
          config.reviewerModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        revision:
          config.revisionModel ||
          config.writerModel ||
          config.defaultModel ||
          'deepseek-v4-pro',
        finalReview:
          config.finalReviewModel ||
          config.defaultModel ||
          'deepseek-v4-pro'
      },
      pricing: {
        inputPricePerMillion: Number(
          config.inputPricePerMillion || 0
        ),
        outputPricePerMillion: Number(
          config.outputPricePerMillion || 0
        )
      },
      automation: {
        enabled: config.courseAutomationEnabled !== false,
        briefEnabled: config.courseBriefGenerationEnabled !== false,
        scanTime: config.courseScanTime || '02:00',
        cleanupMedia: config.courseCleanupMedia !== false,
        autoApproveOutline: config.courseAutoApproveOutline !== false
      },
      openclaw: {
        syncEnabled: config.openclawSyncEnabled !== false,
        model:
          config.openclawModel ||
          'deepseek/deepseek-v4-flash'
      },
      costControl: {
        mode: config.courseCostMode || 'economy',
        timezone: config.courseTimezone || 'Asia/Shanghai',
        peakWindows:
          config.coursePeakWindows ||
          '09:00-12:00,14:00-18:00',
        boundaryBufferMinutes: Number(
          config.courseBoundaryBufferMinutes ?? 10
        )
      },
      source: 'user'
    }
  }

  if (profile.role === 'owner') return ownerGlobalAiConfig()
  return {
    apiKey: '',
    baseUrl: '',
    models: {},
    automation: {
      enabled: false,
      briefEnabled: false,
      scanTime: '02:00',
      cleanupMedia: true,
      autoApproveOutline: true
    },
    openclaw: {
      syncEnabled: false,
      model: 'deepseek/deepseek-v4-flash'
    },
    costControl: ownerGlobalCostControl(),
    source: 'missing'
  }
}

function ownerGlobalEmailConfig() {
  return {
    apiKey: String(process.env.RESEND_API_KEY || '').trim(),
    from: String(
      process.env.REMINDER_FROM ||
      'Law-Tech <onboarding@resend.dev>'
    ).trim(),
    source: 'environment'
  }
}

export async function resolveUserEmailConfig(profile) {
  if (!profile?.id) throw new Error('Workspace profile is required')
  const record = await getUserIntegration(profile.id, 'resend')
  if (record?.enabled !== false && record?.secret_ciphertext) {
    return {
      apiKey: decryptUserSecret(record),
      from: String(record.config?.from || '').trim(),
      source: 'user'
    }
  }
  if (profile.role === 'owner') return ownerGlobalEmailConfig()
  return { apiKey: '', from: '', source: 'missing' }
}
