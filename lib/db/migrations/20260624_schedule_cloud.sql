create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  display_name text,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  source text not null,
  raw_text text,
  raw_payload jsonb not null default '{}'::jsonb,
  interpreted_as text,
  state text not null default 'inbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  capture_id uuid references captures(id) on delete set null,
  title text not null,
  section text not null default '其他',
  section_key text not null default '',
  tone text not null default '',
  schedule_date text not null default 'today',
  starts_at timestamptz,
  time_label text,
  place text,
  content_type text not null default 'action' check (content_type in ('action', 'reading')),
  priority text not null default 'normal',
  importance text not null default 'normal' check (importance in ('important', 'normal')),
  urgency text not null default 'not_urgent' check (urgency in ('urgent', 'not_urgent')),
  is_pinned boolean not null default false,
  priority_source text not null default 'ai' check (priority_source in ('ai', 'user', 'rule')),
  importance_source text not null default 'ai' check (importance_source in ('ai', 'user', 'rule')),
  urgency_source text not null default 'ai' check (urgency_source in ('ai', 'user', 'rule')),
  status text not null default 'active',
  links jsonb not null default '[]'::jsonb,
  children jsonb not null default '[]'::jsonb,
  summary text,
  note text,
  source text not null default 'web',
  ai_trace jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_clerk_user_id on profiles(clerk_user_id);
create index if not exists idx_captures_owner_state on captures(owner_id, state, created_at desc);
create index if not exists idx_schedule_items_owner_date on schedule_items(owner_id, schedule_date, status, starts_at);
create index if not exists idx_schedule_items_owner_type on schedule_items(owner_id, content_type, status, schedule_date);

alter table profiles enable row level security;
alter table captures enable row level security;
alter table schedule_items enable row level security;
