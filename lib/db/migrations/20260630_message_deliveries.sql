create table if not exists public.message_deliveries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'wechat',
  purpose text not null,
  dedupe_key text not null,
  target_key text,
  subject text,
  body_text text not null,
  object_type text,
  object_id text,
  object_url text,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text,
  attempts integer not null default 0,
  external_id text,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (owner_id, channel, dedupe_key)
);

create index if not exists message_deliveries_pending_idx
  on public.message_deliveries(channel, status, scheduled_for, created_at);

create index if not exists message_deliveries_owner_idx
  on public.message_deliveries(owner_id, created_at desc);

alter table public.message_deliveries enable row level security;

drop policy if exists "message deliveries owner read" on public.message_deliveries;
create policy "message deliveries owner read"
  on public.message_deliveries
  for select
  using (owner_id = auth.uid());

comment on table public.message_deliveries is
  'Unified outbound queue. Current active channel is WeChat through the local OpenClaw relay.';
