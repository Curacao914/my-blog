create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  schedule_item_id uuid references schedule_items(id) on delete cascade,
  channel text not null default 'email',
  remind_at timestamptz not null,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reminder_events (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references reminders(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reminders_owner_status_time on reminders(owner_id, status, remind_at);
create index if not exists idx_reminders_schedule_item on reminders(schedule_item_id, status);
create index if not exists idx_reminder_events_reminder_time on reminder_events(reminder_id, created_at desc);
