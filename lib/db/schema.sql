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
