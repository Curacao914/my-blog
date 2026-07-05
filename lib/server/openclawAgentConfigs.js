import {
  buildAgentProfile,
  checksumAgentProfile
} from '@/lib/openclaw/agent-v2/config'
import { supabaseRest } from '@/lib/server/supabase'

const CONFIG_SELECT = [
  'id', 'owner_id', 'environment', 'version_number', 'status', 'profile',
  'checksum', 'parent_config_id', 'rollback_of_config_id',
  'published_by_eval_run_id', 'created_at', 'updated_at', 'published_at'
].join(',')

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

export function validateAgentEnvironment(environment) {
  if (!['preview', 'production'].includes(environment)) {
    throw new Error('Agent Studio environment must be preview or production')
  }
  return environment
}

function requireOwnerId(ownerId) {
  if (!ownerId) throw new Error('Agent Studio ownerId is required')
  return ownerId
}

export function agentStudioAuthorized(auth) {
  return Boolean(
    auth?.ok &&
    auth?.isOwner &&
    !auth?.impersonating &&
    auth?.actorProfile?.role === 'owner'
  )
}

export async function listAgentConfigs({ ownerId, environment }) {
  requireOwnerId(ownerId)
  validateAgentEnvironment(environment)
  return supabaseRest(
    `/openclaw_agent_configs?select=${CONFIG_SELECT}` +
    `&owner_id=${eq(ownerId)}&environment=${eq(environment)}` +
    '&order=version_number.desc'
  )
}

export async function findAgentConfig({ ownerId, environment, configId }) {
  requireOwnerId(ownerId)
  validateAgentEnvironment(environment)
  const rows = await supabaseRest(
    `/openclaw_agent_configs?select=${CONFIG_SELECT}` +
    `&owner_id=${eq(ownerId)}&environment=${eq(environment)}` +
    `&id=${eq(configId)}&limit=1`
  )
  return rows?.[0] || null
}

export async function createAgentConfigDraft({
  ownerId,
  environment,
  profile = {},
  parentConfigId = null
}) {
  requireOwnerId(ownerId)
  validateAgentEnvironment(environment)
  const safeProfile = buildAgentProfile(profile)
  if (parentConfigId) {
    const parent = await findAgentConfig({
      ownerId,
      environment,
      configId: parentConfigId
    })
    if (!parent) {
      throw new Error('Agent config parent must belong to the same owner and environment')
    }
  }
  const previous = await supabaseRest(
    '/openclaw_agent_configs?select=version_number' +
    `&owner_id=${eq(ownerId)}&environment=${eq(environment)}` +
    '&order=version_number.desc&limit=1'
  )
  const versionNumber = Number(previous?.[0]?.version_number || 0) + 1
  const rows = await supabaseRest(
    `/openclaw_agent_configs?select=${CONFIG_SELECT}`,
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        owner_id: ownerId,
        environment,
        version_number: versionNumber,
        status: 'draft',
        profile: safeProfile,
        checksum: checksumAgentProfile(safeProfile),
        parent_config_id: parentConfigId || null
      })
    }
  )
  return rows?.[0] || null
}

export async function updateAgentConfigDraft({
  ownerId,
  environment,
  configId,
  expectedChecksum,
  profile
}) {
  const current = await findAgentConfig({ ownerId, environment, configId })
  if (!current) throw new Error('Agent config was not found')
  if (current.status !== 'draft') {
    throw new Error('Published and retired Agent config versions are immutable')
  }
  if (!expectedChecksum || current.checksum !== expectedChecksum) {
    throw new Error('Agent config draft is stale or changed concurrently')
  }
  const safeProfile = buildAgentProfile(profile)
  const rows = await supabaseRest(
    `/openclaw_agent_configs?select=${CONFIG_SELECT}` +
    `&owner_id=${eq(ownerId)}&environment=${eq(environment)}` +
    `&id=${eq(configId)}&status=eq.draft&checksum=${eq(expectedChecksum)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        profile: safeProfile,
        checksum: checksumAgentProfile(safeProfile),
        updated_at: new Date().toISOString()
      })
    }
  )
  if (!rows?.[0]) throw new Error('Agent config draft changed concurrently')
  return rows[0]
}

export async function publishAgentConfig({
  ownerId,
  environment,
  configId,
  evaluationRunId
}) {
  requireOwnerId(ownerId)
  validateAgentEnvironment(environment)
  const rows = await supabaseRest('/rpc/publish_openclaw_agent_config', {
    method: 'POST',
    body: JSON.stringify({
      p_owner_id: ownerId,
      p_environment: environment,
      p_config_id: configId,
      p_eval_run_id: evaluationRunId
    })
  })
  return rows?.[0] || rows || null
}

export async function rollbackAgentConfig({
  ownerId,
  environment,
  targetConfigId,
  evaluationRunId = null
}) {
  requireOwnerId(ownerId)
  validateAgentEnvironment(environment)
  const rows = await supabaseRest('/rpc/rollback_openclaw_agent_config', {
    method: 'POST',
    body: JSON.stringify({
      p_owner_id: ownerId,
      p_environment: environment,
      p_target_config_id: targetConfigId,
      p_eval_run_id: evaluationRunId
    })
  })
  return rows?.[0] || rows || null
}
