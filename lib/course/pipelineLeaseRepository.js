import { supabaseRest } from '@/lib/server/supabase'

function cleanWorkerId(value) {
  const result = String(value || '').trim().slice(0, 180)
  if (!result) throw new Error('workerId is required')
  if (!/^[A-Za-z0-9._:-]+$/.test(result)) {
    throw new Error('workerId contains unsupported characters')
  }
  return result
}

function cleanReplayKey(value) {
  const result = String(value || '').trim().slice(0, 180)
  if (!result) throw new Error('replayKey is required')
  if (!/^[A-Za-z0-9._:-]+$/.test(result)) {
    throw new Error('replayKey contains unsupported characters')
  }
  return result
}

function leaseSeconds(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 900
  return Math.max(60, Math.min(3600, Math.round(parsed)))
}

export async function claimCoursePipelineTask(
  ownerId,
  input = {}
) {
  if (!ownerId) throw new Error('ownerId is required')
  const rows = await supabaseRest(
    '/rpc/claim_course_pipeline_task',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_worker_id: cleanWorkerId(input.workerId),
        p_lease_seconds: leaseSeconds(
          input.leaseSeconds
        )
      })
    }
  )
  return rows?.[0] || null
}


export async function claimSpecificCoursePipelineTask(
  ownerId,
  replayKey,
  input = {}
) {
  if (!ownerId) throw new Error('ownerId is required')
  const rows = await supabaseRest(
    '/rpc/claim_course_pipeline_task_by_key',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_replay_key: cleanReplayKey(replayKey),
        p_worker_id: cleanWorkerId(input.workerId),
        p_lease_seconds: leaseSeconds(
          input.leaseSeconds
        )
      })
    }
  )
  return rows?.[0] || null
}

export async function heartbeatCoursePipelineTask(
  ownerId,
  replayKey,
  input = {}
) {
  if (!ownerId) throw new Error('ownerId is required')
  const rows = await supabaseRest(
    '/rpc/heartbeat_course_pipeline_task',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_replay_key: cleanReplayKey(replayKey),
        p_worker_id: cleanWorkerId(input.workerId),
        p_lease_seconds: leaseSeconds(
          input.leaseSeconds
        )
      })
    }
  )
  return rows?.[0] || null
}
