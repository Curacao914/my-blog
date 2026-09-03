create table if not exists public.openclaw_conversation_states (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'openclaw-weixin',
  sender_id text not null default '',
  thread_id text not null default '',
  state jsonb not null default '{}'::jsonb,
  last_message_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, channel, sender_id, thread_id)
);

create index if not exists openclaw_conversation_states_expiry_idx
  on public.openclaw_conversation_states(expires_at);

create index if not exists openclaw_conversation_states_owner_idx
  on public.openclaw_conversation_states(owner_id, updated_at desc);

alter table public.openclaw_conversation_states enable row level security;

drop policy if exists "openclaw conversation owner read" on public.openclaw_conversation_states;
create policy "openclaw conversation owner read"
  on public.openclaw_conversation_states
  for select
  using (owner_id = auth.uid());

comment on table public.openclaw_conversation_states is
  'Short-lived transactional context for the Law-Tech WeChat command router. It is not a general chat-history store.';
