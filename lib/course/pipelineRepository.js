import { COURSE_PIPELINE_STAGES } from '@/lib/course/pipelineQueue'
import {
  mergeCoursePipelineTaskPatch,
  normalizeCoursePipelineDiscovery,
  normalizeCoursePipelineRetry,
  normalizeCoursePipelineStagePatch,
  summarizeCoursePipelineTasks
} from '@/lib/course/pipelinePayload'
import { supabaseRest } from '@/lib/server/supabase'

const SELECT = [
  'id',
  'owner_id',
  'replay_key',
  'course_key',
  'course_name',
  'title',
  'starts_at_text',
  'teacher',
  'stage',
  'attempts',
  'artifacts',
  'runtime',
  'last_error',
  'next_attempt_at',
  'history',
  'first_seen_at',
  'created_at',
  'updated_at'
].join(',')

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function safeLimit(value, fallback = 100) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(200, Math.round(parsed)))
}

export async function discoverCoursePipelineTasks(
  ownerId,
  input
) {
  if (!ownerId) throw new Error('ownerId is required')
  const replays = normalizeCoursePipelineDiscovery(input)
  const now = new Date().toISOString()
  const rows = replays.map(replay => ({
    owner_id: ownerId,
    ...replay,
    stage: 'queued',
    attempts: {},
    artifacts: {},
    runtime: {},
    last_error: null,
    next_attempt_at: null,
    history: [
      {
        stage: 'queued',
        at: now,
        reason: 'discovered',
        errorKind: null
      }
    ],
    first_seen_at: now,
    updated_at: now
  }))

  const inserted = await supabaseRest(
    `/course_pipeline_tasks?on_conflict=owner_id,replay_key&select=${SELECT}`,
    {
      method: 'POST',
      headers: {
        Prefer:
          'resolution=ignore-duplicates,return=representation'
      },
      body: JSON.stringify(rows)
    }
  )

  return {
    received: replays.length,
    added: inserted || [],
    addedCount: inserted?.length || 0
  }
}

export async function listCoursePipelineTasks(
  ownerId,
  options = {}
) {
  if (!ownerId) throw new Error('ownerId is required')
  const params = [
    `select=${SELECT}`,
    `owner_id=${eq(ownerId)}`,
    'order=first_seen_at.asc',
    `limit=${safeLimit(options.limit)}`
  ]

  if (options.stage) {
    const stage = String(options.stage)
    if (!COURSE_PIPELINE_STAGES.includes(stage)) {
      throw new Error(`unsupported stage: ${stage}`)
    }
    params.push(`stage=${eq(stage)}`)
  }

  const tasks =
    (await supabaseRest(
      `/course_pipeline_tasks?${params.join('&')}`
    )) || []

  return {
    tasks,
    summary: summarizeCoursePipelineTasks(tasks)
  }
}

export async function getCoursePipelineTask(
  ownerId,
  replayKey
) {
  if (!ownerId) throw new Error('ownerId is required')
  if (!replayKey) throw new Error('replayKey is required')

  const rows = await supabaseRest(
    `/course_pipeline_tasks?select=${SELECT}` +
      `&owner_id=${eq(ownerId)}` +
      `&replay_key=${eq(replayKey)}` +
      '&limit=1'
  )
  return rows?.[0] || null
}

export async function updateCoursePipelineTaskStage(
  ownerId,
  replayKey,
  input
) {
  const current = await getCoursePipelineTask(
    ownerId,
    replayKey
  )
  if (!current) return null

  const normalized =
    normalizeCoursePipelineStagePatch(input)
  const patch = mergeCoursePipelineTaskPatch(
    current,
    normalized
  )

  const rows = await supabaseRest(
    `/course_pipeline_tasks?select=${SELECT}` +
      `&owner_id=${eq(ownerId)}` +
      `&replay_key=${eq(replayKey)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify(patch)
    }
  )
  return rows?.[0] || null
}

export async function retryCoursePipelineTask(
  ownerId,
  replayKey,
  reason = ''
) {
  const current = await getCoursePipelineTask(
    ownerId,
    replayKey
  )
  if (!current) return null

  const patch = normalizeCoursePipelineRetry(
    current,
    reason
  )
  const rows = await supabaseRest(
    `/course_pipeline_tasks?select=${SELECT}` +
      `&owner_id=${eq(ownerId)}` +
      `&replay_key=${eq(replayKey)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify(patch)
    }
  )
  return rows?.[0] || null
}
