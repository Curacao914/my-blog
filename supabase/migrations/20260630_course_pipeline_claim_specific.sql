-- Controlled one-replay claim for the real E2E regression harness.
-- Run after 20260630_course_pipeline_leases.sql.

create or replace function public.claim_course_pipeline_task_by_key(
  p_owner_id uuid,
  p_replay_key text,
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns setof public.course_pipeline_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lease_seconds integer :=
    greatest(60, least(coalesce(p_lease_seconds, 900), 3600));
begin
  if p_owner_id is null then
    raise exception 'owner id is required';
  end if;

  if nullif(btrim(p_replay_key), '') is null then
    raise exception 'replay key is required';
  end if;

  if nullif(btrim(p_worker_id), '') is null then
    raise exception 'worker id is required';
  end if;

  return query
  update public.course_pipeline_tasks as task
  set
    claimed_by = p_worker_id,
    lease_expires_at =
      now() + make_interval(secs => v_lease_seconds),
    heartbeat_at = now(),
    updated_at = now()
  where task.owner_id = p_owner_id
    and task.replay_key = p_replay_key
    and task.stage in (
      'queued',
      'downloading',
      'downloaded',
      'transcribing',
      'transcript_ready',
      'building_textpack',
      'textpack_ready',
      'uploading',
      'uploaded',
      'cleanup',
      'failed'
    )
    and (
      task.next_attempt_at is null
      or task.next_attempt_at <= now()
    )
    and (
      task.lease_expires_at is null
      or task.lease_expires_at <= now()
      or task.claimed_by = p_worker_id
    )
  returning task.*;
end;
$$;

revoke all on function public.claim_course_pipeline_task_by_key(
  uuid,
  text,
  text,
  integer
) from public;

grant execute on function public.claim_course_pipeline_task_by_key(
  uuid,
  text,
  text,
  integer
) to service_role;

comment on function public.claim_course_pipeline_task_by_key(
  uuid,
  text,
  text,
  integer
) is
  'Atomically claims one exact actionable replay for controlled regression and recovery.';
