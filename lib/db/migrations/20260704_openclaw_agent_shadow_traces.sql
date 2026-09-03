create table if not exists public.openclaw_agent_shadow_traces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null,
  sender_hash text not null check (sender_hash ~ '^[a-f0-9]{64}$'),
  thread_hash text not null check (thread_hash ~ '^[a-f0-9]{64}$'),
  message_hash text not null check (message_hash ~ '^[a-f0-9]{64}$'),
  config_id uuid not null references public.openclaw_agent_configs(id),
  config_version integer not null check (config_version > 0),
  message_ciphertext text,
  message_iv text,
  message_tag text,
  legacy_reply_ciphertext text,
  legacy_reply_iv text,
  legacy_reply_tag text,
  intent jsonb,
  plan jsonb,
  resolution jsonb,
  gate jsonb,
  candidate_summary jsonb not null default '[]'::jsonb,
  differences jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  model text,
  estimated_usd numeric(12, 8) not null default 0,
  latency_ms integer not null default 0 check (latency_ms >= 0),
  error_category text,
  error_detail text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique (owner_id, channel, message_hash, config_id)
);

create index if not exists openclaw_agent_shadow_trace_expiry_idx
  on public.openclaw_agent_shadow_traces (expires_at);
create index if not exists openclaw_agent_shadow_trace_config_idx
  on public.openclaw_agent_shadow_traces (owner_id, config_id, created_at desc);

alter table public.openclaw_agent_shadow_traces enable row level security;

drop policy if exists "agent shadow traces owner or admin"
  on public.openclaw_agent_shadow_traces;
create policy "agent shadow traces owner or admin"
  on public.openclaw_agent_shadow_traces for select
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  );

revoke insert, update, delete on public.openclaw_agent_shadow_traces from anon, authenticated;
grant select on public.openclaw_agent_shadow_traces to authenticated;
