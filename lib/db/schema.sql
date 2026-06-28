create extension if not exists pgcrypto;

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  type text not null check (type in ('article', 'course-note', 'reading-note', 'project', 'page')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  source text not null default 'manual' check (source in ('notion', 'markdown', 'manual', 'course-worker')),
  source_id text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references content_items(id) on delete cascade,
  version integer not null,
  body_markdown text not null,
  checksum text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (item_id, version)
);

create unique index if not exists content_versions_one_published_per_item
  on content_versions (item_id)
  where is_published = true;

create table if not exists content_access (
  item_id uuid primary key references content_items(id) on delete cascade,
  mode text not null default 'private' check (mode in ('public', 'password', 'private')),
  password_hash text,
  expires_at timestamptz,
  allow_indexing boolean not null default false,
  allow_rss boolean not null default false,
  allow_sitemap boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_display (
  item_id uuid primary key references content_items(id) on delete cascade,
  category text,
  tags text[] not null default '{}',
  folder_path text[] not null default '{}',
  course_name text,
  course_lesson text,
  course_teacher text,
  course_date date,
  pinned boolean not null default false,
  show_in_recent boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_assets (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references content_items(id) on delete cascade,
  url text not null,
  alt text,
  checksum text,
  created_at timestamptz not null default now()
);

create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references content_items(id) on delete cascade,
  token text unique not null,
  password_hash text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  title text not null,
  status text not null default 'inbox' check (status in ('inbox', 'planned', 'waiting', 'done', 'archived')),
  type text check (type in ('course', 'student-work', 'life', 'research', 'writing', 'admin')),
  priority text check (priority in ('low', 'normal', 'high')),
  starts_at timestamptz,
  due_at timestamptz,
  remind_at timestamptz,
  place text,
  links text[] not null default '{}',
  file_refs jsonb not null default '[]'::jsonb,
  source text not null default 'web',
  source_user text,
  source_message_id text,
  attachments jsonb not null default '[]'::jsonb,
  reminder_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tasks
  add column if not exists source text not null default 'web';

alter table tasks
  add column if not exists source_user text;

alter table tasks
  add column if not exists source_message_id text;

alter table tasks
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table tasks
  add column if not exists reminder_sent_at timestamptz;

create table if not exists course_jobs (
  id uuid primary key default gen_random_uuid(),
  course_name text not null,
  lesson text,
  teacher text,
  run_mode text not null default 'course_batch' check (run_mode in ('single_lesson', 'course_batch')),
  status text not null default 'created' check (
    status in (
      'created',
      'preprocessing',
      'outline-ready',
      'outline-confirmed',
      'generating',
      'verifying',
      'done',
      'failed'
    )
  ),
  current_node text,
  preferences jsonb not null default '{}'::jsonb,
  preprocess_result jsonb not null default '{}'::jsonb,
  preprocess_reported_at timestamptz,
  local_workdir text,
  material_bundle_confirmed_at timestamptz,
  preflight_confirmed_at timestamptz,
  output_content_item_id uuid references content_items(id),
  changelog jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table course_jobs
  add column if not exists run_mode text not null default 'course_batch'
    check (run_mode in ('single_lesson', 'course_batch'));

alter table course_jobs
  add column if not exists preferences jsonb not null default '{}'::jsonb;

alter table course_jobs
  add column if not exists preprocess_result jsonb not null default '{}'::jsonb;

alter table course_jobs
  add column if not exists preprocess_reported_at timestamptz;

alter table course_jobs
  add column if not exists local_workdir text;

alter table course_jobs
  add column if not exists material_bundle_confirmed_at timestamptz;

alter table course_jobs
  add column if not exists preflight_confirmed_at timestamptz;

create table if not exists course_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references course_jobs(id) on delete cascade,
  kind text not null check (kind in ('srt', 'ppt', 'pptx', 'pdf', 'image', 'markdown', 'other')),
  role text not null default 'supplement' check (role in ('transcript', 'slides', 'reading', 'supplement', 'output')),
  original_name text,
  mime_type text,
  size_bytes bigint,
  sort_order integer not null default 0,
  lesson_order integer,
  lesson_key text,
  storage_path text not null,
  checksum text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table course_assets
  add column if not exists role text not null default 'supplement'
    check (role in ('transcript', 'slides', 'reading', 'supplement', 'output'));

alter table course_assets
  add column if not exists original_name text;

alter table course_assets
  add column if not exists mime_type text;

alter table course_assets
  add column if not exists size_bytes bigint;

alter table course_assets
  add column if not exists sort_order integer not null default 0;

alter table course_assets
  add column if not exists lesson_order integer;

alter table course_assets
  add column if not exists lesson_key text;

alter table course_assets
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists course_lessons (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references course_jobs(id) on delete cascade,
  lesson_order integer not null,
  lesson_key text not null,
  title text,
  transcript_asset_id uuid references course_assets(id),
  status text not null default 'created' check (
    status in (
      'created',
      'preprocessed',
      'outline-ready',
      'outline-confirmed',
      'generating',
      'verifying',
      'done',
      'failed'
    )
  ),
  outline_json jsonb not null default '{}'::jsonb,
  outline_confirmed_at timestamptz,
  previous_context jsonb not null default '{}'::jsonb,
  output_content_item_id uuid references content_items(id),
  changelog jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, lesson_order)
);

create index if not exists content_items_status_updated_idx
  on content_items (status, updated_at desc);

create index if not exists content_display_category_idx
  on content_display (category);

create index if not exists tasks_status_updated_idx
  on tasks (status, updated_at desc);

create index if not exists tasks_source_created_idx
  on tasks (source, created_at desc);

create index if not exists tasks_remind_due_idx
  on tasks (remind_at, reminder_sent_at)
  where remind_at is not null and status not in ('done', 'archived');

create index if not exists course_jobs_status_updated_idx
  on course_jobs (status, updated_at desc);

create index if not exists course_assets_job_role_idx
  on course_assets (job_id, role, sort_order);

create index if not exists course_lessons_job_order_idx
  on course_lessons (job_id, lesson_order);

-- law-tech workspace schema additions
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
  sender_id text,
  message_id text,
  idempotency_key text,
  raw_text text,
  raw_payload jsonb not null default '{}'::jsonb,
  interpreted_as text,
  result jsonb not null default '{}'::jsonb,
  state text not null default 'inbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  capture_id uuid references captures(id) on delete set null,
  kind text not null,
  title text not null,
  storage_path text,
  external_url text,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
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
  schedule_date text not null default 'inbox',
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

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  title text not null,
  teacher text,
  term text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  session_order integer,
  taught_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  course_session_id uuid references course_sessions(id) on delete set null,
  title text not null,
  body_markdown text not null default '',
  note_type text not null default 'note',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade,
  step_order integer not null,
  title text not null,
  status text not null default 'waiting',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists publishables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  slug text unique not null,
  title text not null,
  summary text,
  category text,
  tags text[] not null default '{}',
  visibility text not null default 'private',
  status text not null default 'draft',
  body_markdown text not null default '',
  snapshot_checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shares (
  id uuid primary key default gen_random_uuid(),
  publishable_id uuid references publishables(id) on delete cascade,
  token text unique not null,
  password_hash text,
  expires_at timestamptz,
  max_visits integer,
  visit_count integer not null default 0,
  created_at timestamptz not null default now()
);

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

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete set null,
  actor text not null default 'system',
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_captures_owner_state on captures(owner_id, state, created_at desc);
create unique index if not exists idx_captures_owner_idempotency on captures(owner_id, idempotency_key) where idempotency_key is not null;
create index if not exists idx_tasks_owner_status on tasks(owner_id, status, due_at);
create index if not exists idx_schedule_items_owner_date on schedule_items(owner_id, schedule_date, status, starts_at);
create index if not exists idx_schedule_items_owner_type on schedule_items(owner_id, content_type, status, schedule_date);
create index if not exists idx_materials_owner_kind on materials(owner_id, kind, created_at desc);
create index if not exists idx_notes_owner_status on notes(owner_id, status, updated_at desc);
create index if not exists idx_notes_metadata on notes using gin(metadata);
create index if not exists idx_workflows_owner_status on workflows(owner_id, status, created_at desc);
create index if not exists idx_publishables_visibility on publishables(visibility, status, updated_at desc);
create index if not exists idx_reminders_owner_status_time on reminders(owner_id, status, remind_at);
create index if not exists idx_reminders_schedule_item on reminders(schedule_item_id, status);
create index if not exists idx_reminder_events_reminder_time on reminder_events(reminder_id, created_at desc);
create index if not exists idx_reminder_preferences_daily on reminder_preferences(daily_digest_enabled, weekly_digest_enabled);
