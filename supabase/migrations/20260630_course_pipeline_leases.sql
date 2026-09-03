-- Course pipeline leasing and atomic worker claim.
-- Run after 20260629_course_pipeline_tasks.sql.

alter table public.course_pipeline_tasks
  add column if not exists claimed_by text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz;

create index if not exists course_pipeline_tasks_claim_idx
  on public.course_pipeline_tasks (
    owner_id,
    stage,
    next_attempt_at,
    lease_expires_at,
    first_seen_at
  );

create or replace function public.claim_course_pipeline_task(
  p_owner_id uuid,
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

  if nullif(btrim(p_worker_id), '') is null then
    raise exception 'worker id is required';
  end if;

  return query
  with candidate as (
    select task.id
    from public.course_pipeline_tasks as task
    where task.owner_id = p_owner_id
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
      )
    order by task.first_seen_at asc, task.updated_at asc
    for update skip locked
    limit 1
  )
  update public.course_pipeline_tasks as task
  set
    claimed_by = p_worker_id,
    lease_expires_at =
      now() + make_interval(secs => v_lease_seconds),
    heartbeat_at = now(),
    updated_at = now()
  from candidate
  where task.id = candidate.id
  returning task.*;
end;
$$;

create or replace function public.heartbeat_course_pipeline_task(
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
  return query
  update public.course_pipeline_tasks as task
  set
    lease_expires_at =
      now() + make_interval(secs => v_lease_seconds),
    heartbeat_at = now(),
    updated_at = now()
  where task.owner_id = p_owner_id
    and task.replay_key = p_replay_key
    and task.claimed_by = p_worker_id
    and task.lease_expires_at > now()
  returning task.*;
end;
$$;

revoke all on function public.claim_course_pipeline_task(
  uuid,
  text,
  integer
) from public;

revoke all on function public.heartbeat_course_pipeline_task(
  uuid,
  text,
  text,
  integer
) from public;

grant execute on function public.claim_course_pipeline_task(
  uuid,
  text,
  integer
) to service_role;

grant execute on function public.heartbeat_course_pipeline_task(
  uuid,
  text,
  text,
  integer
) to service_role;

comment on column public.course_pipeline_tasks.claimed_by is
  'Opaque Worker instance ID. Never a credential.';

comment on column public.course_pipeline_tasks.lease_expires_at is
  'Expired leases may be atomically claimed by another Worker.';

comment on function public.claim_course_pipeline_task(
  uuid,
  text,
  integer
) is
  'Atomically claims the oldest actionable course task using SKIP LOCKED.';
