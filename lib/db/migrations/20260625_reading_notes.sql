create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  title text not null,
  body_markdown text not null default '',
  note_type text not null default 'note',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_owner_status on notes(owner_id, status, updated_at desc);
create index if not exists idx_notes_metadata on notes using gin(metadata);
