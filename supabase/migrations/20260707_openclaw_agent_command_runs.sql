-- Agent Command Lane v1 audit table.
-- This table records owner-only command previews and user decisions.
-- It never stores secrets and never implies tool execution.

create table if not exists public.openclaw_agent_command_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  environment text not null check (environment in ('preview', 'production')),
  command_text text not null check (char_length(command_text) <= 2000),
  status text not null default 'previewed' check (
    status in ('previewed', 'accepted_preview', 'needs_adjustment', 'dismissed', 'error')
  ),
  preview_only boolean not null default true,
  execution_allowed boolean not null default false,
  writes_performed boolean not null default false,
  tool_executed boolean not null default false,
  config_id uuid,
  config_version integer,
  config_checksum text,
  intent jsonb not null default '{}'::jsonb,
  plan jsonb not null default '{}'::jsonb,
  gate jsonb not null default '{}'::jsonb,
  resolution jsonb not null default '{}'::jsonb,
  candidates jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  error text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint openclaw_agent_command_runs_preview_only
    check (preview_only is true and execution_allowed is false and writes_performed is false and tool_executed is false)
);

create index if not exists openclaw_agent_command_runs_owner_created_idx
  on public.openclaw_agent_command_runs(owner_id, created_at desc);

create index if not exists openclaw_agent_command_runs_owner_status_idx
  on public.openclaw_agent_command_runs(owner_id, status, created_at desc);

alter table public.openclaw_agent_command_runs enable row level security;

create or replace function public.touch_openclaw_agent_command_runs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_openclaw_agent_command_runs_updated_at
  on public.openclaw_agent_command_runs;

create trigger touch_openclaw_agent_command_runs_updated_at
before update on public.openclaw_agent_command_runs
for each row execute function public.touch_openclaw_agent_command_runs_updated_at();
