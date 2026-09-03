create table if not exists reminder_preferences (
  owner_id uuid primary key references profiles(id) on delete cascade,
  email text,
  daily_digest_enabled boolean not null default true,
  weekly_digest_enabled boolean not null default false,
  due_reminders_enabled boolean not null default true,
  timezone text not null default 'Asia/Shanghai',
  daily_time text not null default '09:00',
  weekly_day integer not null default 1 check (weekly_day between 0 and 6),
  last_daily_sent_on date,
  last_weekly_sent_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reminder_preferences_daily
  on reminder_preferences(daily_digest_enabled, weekly_digest_enabled);

alter table reminder_preferences enable row level security;
