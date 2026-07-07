import { supabaseRest } from '@/lib/server/supabase'

const SELECT = [
  'id',
  'owner_id',
  'environment',
  'command_text',
  'status',
  'preview_only',
  'execution_allowed',
  'writes_performed',
  'tool_executed',
  'config_id',
  'config_version',
  'config_checksum',
  'intent',
  'plan',
  'gate',
  'resolution',
  'candidates',
  'summary',
  'usage',
  'error',
  'decision_note',
  'decided_at',
  'created_at',
  'updated_at'
].join(',')

const VALID_DECISIONS = new Set(['accepted_preview', 'needs_adjustment', 'dismissed'])

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function limit(value, fallback = 20) {
  return Math.max(1, Math.min(Number(value) || fallback, 50))
}

export function publicAgentCommandRun(row = {}) {
  return {
    id: row.id,
    environment: row.environment,
    commandText: row.command_text,
    status: row.status,
    previewOnly: row.preview_only !== false,
    executionAllowed: Boolean(row.execution_allowed),
    writesPerformed: Boolean(row.writes_performed),
    toolExecuted: Boolean(row.tool_executed),
    config: {
      id: row.config_id || null,
      version: row.config_version || null,
      checksum: row.config_checksum || ''
    },
    intent: row.intent || {},
    plan: row.plan || {},
    gate: row.gate || {},
    resolution: row.resolution || {},
    candidates: Array.isArray(row.candidates) ? row.candidates : [],
    summary: row.summary || {},
    usage: row.usage || {},
    error: row.error || '',
    decisionNote: row.decision_note || '',
    decidedAt: row.decided_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }
}

export async function insertAgentCommandRun(ownerId, preview) {
  if (!ownerId) throw new Error('ownerId is required')
  if (!preview?.command) throw new Error('command preview is required')

  const rows = await supabaseRest(`/openclaw_agent_command_runs?select=${SELECT}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      owner_id: ownerId,
      environment: preview.environment,
      command_text: preview.command,
      status: 'previewed',
      preview_only: true,
      execution_allowed: false,
      writes_performed: false,
      tool_executed: false,
      config_id: preview.config?.id || null,
      config_version: preview.config?.version || null,
      config_checksum: preview.config?.checksum || null,
      intent: preview.intent || {},
      plan: preview.plan || {},
      gate: preview.gate || {},
      resolution: preview.resolution || {},
      candidates: preview.candidates || [],
      summary: preview.summary || {},
      usage: preview.usage || {},
      error: preview.error || null
    })
  })

  return publicAgentCommandRun(rows?.[0] || {})
}

export async function listAgentCommandRuns(ownerId, options = {}) {
  if (!ownerId) throw new Error('ownerId is required')
  const params = [
    `select=${SELECT}`,
    `owner_id=${eq(ownerId)}`,
    'order=created_at.desc',
    `limit=${limit(options.limit)}`
  ]
  if (options.environment) params.push(`environment=${eq(options.environment)}`)
  if (options.status) params.push(`status=${eq(options.status)}`)
  const rows = await supabaseRest(`/openclaw_agent_command_runs?${params.join('&')}`)
  return (rows || []).map(publicAgentCommandRun)
}

export async function updateAgentCommandRunDecision(ownerId, runId, decision, note = '') {
  if (!ownerId) throw new Error('ownerId is required')
  if (!runId) throw new Error('runId is required')
  if (!VALID_DECISIONS.has(decision)) {
    const error = new Error('Invalid command run decision')
    error.status = 400
    error.code = 'INVALID_DECISION'
    throw error
  }

  const rows = await supabaseRest(
    `/openclaw_agent_command_runs?id=${eq(runId)}&owner_id=${eq(ownerId)}&select=${SELECT}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: decision,
        decision_note: String(note || '').slice(0, 1000) || null,
        decided_at: new Date().toISOString(),
        preview_only: true,
        execution_allowed: false,
        writes_performed: false,
        tool_executed: false
      })
    }
  )

  if (!rows?.[0]) {
    const error = new Error('Command run was not found')
    error.status = 404
    error.code = 'COMMAND_RUN_NOT_FOUND'
    throw error
  }

  return publicAgentCommandRun(rows[0])
}
