-- Course pipeline control plane.
-- This table stores task metadata, state, counters and object references only.
-- Video/audio bytes must remain on the Worker scratch disk or external object
-- storage such as Cloudflare R2. Never write signed URLs or credentials here.

create table if not exists public.course_pipeline_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  replay_key text not null,
  course_key text not null,
  course_name text not null,
  title text not null default '',
  starts_at_text text not null default '',
  teacher text not null default '',
  stage text not null default 'queued'
    check (
      stage in (
        'discovered',
        'queued',
        'downloading',
        'downloaded',
        'transcribing',
        'transcript_ready',
        'building_textpack',
        'textpack_ready',
        'uploading',
        'uploaded',
        'awaiting_llm_window',
        'writing',
        'cleanup',
        'completed',
        'failed',
        'needs_attention'
      )
    ),
  attempts jsonb not null default '{}'::jsonb,
  artifacts jsonb not null default '{}'::jsonb,
  runtime jsonb not null default '{}'::jsonb,
  last_error jsonb,
  next_attempt_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, replay_key)
);

comment on table public.course_pipeline_tasks is
  'Course automation state only. No raw video/audio bytes, credentials, signed URLs or playback tokens.';

comment on column public.course_pipeline_tasks.artifacts is
  'Stable object keys/checksums and generated resource IDs only; never signed URLs.';

create index if not exists course_pipeline_tasks_owner_stage_idx
  on public.course_pipeline_tasks (owner_id, stage, first_seen_at);

create index if not exists course_pipeline_tasks_retry_idx
  on public.course_pipeline_tasks (next_attempt_at)
  where next_attempt_at is not null;

alter table public.course_pipeline_tasks enable row level security;

revoke all on table public.course_pipeline_tasks from anon, authenticated;
grant all on table public.course_pipeline_tasks to service_role;
