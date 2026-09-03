create table if not exists public.course_brief_reads (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  course_job_id uuid not null references public.course_jobs(id) on delete cascade,
  lesson_key text not null,
  brief_fingerprint text not null,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, course_job_id, lesson_key)
);

create index if not exists course_brief_reads_owner_read_at_idx
  on public.course_brief_reads (owner_id, read_at desc);

alter table public.course_brief_reads enable row level security;

comment on table public.course_brief_reads is
  'Per-owner read state for versioned course briefs. Server APIs use the service role; a changed fingerprint becomes unread again.';
