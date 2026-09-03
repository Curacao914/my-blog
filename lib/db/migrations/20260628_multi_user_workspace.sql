-- Multi-user workspace foundation.
-- Run after the existing profile/schedule/note/reminder migrations.

create extension if not exists pgcrypto;

alter table profiles
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists last_seen_at timestamptz;

update profiles
set status = 'active'
where role = 'owner' and status = 'pending';

update profiles
set role = 'member'
where role is null or role not in ('owner', 'member');

DO $$
DECLARE
  profile_count integer;
  owner_count integer;
BEGIN
  SELECT count(*) INTO profile_count FROM profiles;
  SELECT count(*) INTO owner_count FROM profiles WHERE role = 'owner';
  IF profile_count > 0 AND owner_count <> 1 THEN
    RAISE EXCEPTION 'Multi-user migration requires exactly one existing owner profile; found %', owner_count;
  END IF;
END $$;

alter table profiles alter column role set default 'member';

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('owner', 'member'));
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check check (status in ('pending', 'active', 'suspended'));

create unique index if not exists idx_profiles_email_lower
  on profiles(lower(email)) where email is not null;
create index if not exists idx_profiles_status_role
  on profiles(status, role, created_at);

create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references profiles(id) on delete set null,
  accepted_by uuid references profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_workspace_invites_email_lower
  on workspace_invites(lower(email));
create index if not exists idx_workspace_invites_status
  on workspace_invites(status, created_at desc);

create table if not exists user_integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  provider text not null check (provider in ('openai-compatible', 'resend')),
  enabled boolean not null default true,
  base_url text,
  secret_ciphertext text,
  secret_iv text,
  secret_tag text,
  secret_hint text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, provider)
);

create index if not exists idx_user_integrations_owner
  on user_integrations(owner_id, provider);

alter table tasks add column if not exists owner_id uuid references profiles(id) on delete cascade;
alter table content_items add column if not exists owner_id uuid references profiles(id) on delete cascade;
alter table course_jobs add column if not exists owner_id uuid references profiles(id) on delete cascade;

DO $$
DECLARE
  primary_owner uuid;
BEGIN
  SELECT id INTO primary_owner
  FROM profiles
  WHERE role = 'owner'
  ORDER BY created_at asc
  LIMIT 1;

  IF primary_owner IS NOT NULL THEN
    UPDATE tasks SET owner_id = primary_owner WHERE owner_id IS NULL;
    UPDATE content_items SET owner_id = primary_owner WHERE owner_id IS NULL;
    UPDATE course_jobs SET owner_id = primary_owner WHERE owner_id IS NULL;
  END IF;
END $$;

create index if not exists idx_tasks_owner_status on tasks(owner_id, status, due_at);
create index if not exists idx_content_items_owner_status on content_items(owner_id, status, updated_at desc);
create index if not exists idx_course_jobs_owner_status on course_jobs(owner_id, status, updated_at desc);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE owner_id IS NULL) THEN
    ALTER TABLE tasks ALTER COLUMN owner_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM content_items WHERE owner_id IS NULL) THEN
    ALTER TABLE content_items ALTER COLUMN owner_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM course_jobs WHERE owner_id IS NULL) THEN
    ALTER TABLE course_jobs ALTER COLUMN owner_id SET NOT NULL;
  END IF;
END $$;

-- Clerk sessions expose the user id as the JWT subject when Supabase third-party auth is enabled.
create or replace function law_tech_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where clerk_user_id = auth.jwt()->>'sub' limit 1
$$;

create or replace function law_tech_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = law_tech_current_profile_id()
      and role = 'owner'
      and status = 'active'
  )
$$;

alter table profiles enable row level security;
alter table workspace_invites enable row level security;
alter table user_integrations enable row level security;
alter table tasks enable row level security;
alter table content_items enable row level security;
alter table course_jobs enable row level security;
alter table schedule_items enable row level security;
alter table notes enable row level security;
alter table captures enable row level security;
alter table reminders enable row level security;
alter table reminder_preferences enable row level security;
alter table content_versions enable row level security;
alter table content_access enable row level security;
alter table content_display enable row level security;
alter table content_assets enable row level security;
alter table share_links enable row level security;
alter table course_assets enable row level security;
alter table course_lessons enable row level security;
alter table reminder_events enable row level security;

-- These tables belong to an older optional workspace schema and may not exist
-- in installations that use course_jobs/content_items directly. Enable RLS only
-- when the relation is present instead of aborting the whole migration.
DO $$
DECLARE
  optional_table text;
BEGIN
  FOREACH optional_table IN ARRAY ARRAY[
    'materials',
    'courses',
    'course_sessions',
    'workflows',
    'workflow_steps',
    'publishables',
    'shares'
  ]
  LOOP
    IF to_regclass(format('public.%I', optional_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', optional_table);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS profiles_self_or_owner ON profiles;
  CREATE POLICY profiles_self_or_owner ON profiles
    FOR SELECT USING (id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS profiles_self_update ON profiles;
  DROP POLICY IF EXISTS profiles_owner_write ON profiles;
  CREATE POLICY profiles_owner_write ON profiles
    FOR ALL USING (law_tech_is_owner()) WITH CHECK (law_tech_is_owner());

  DROP POLICY IF EXISTS workspace_invites_owner_only ON workspace_invites;
  CREATE POLICY workspace_invites_owner_only ON workspace_invites
    FOR ALL USING (law_tech_is_owner()) WITH CHECK (law_tech_is_owner());

  DROP POLICY IF EXISTS user_integrations_owner_scope ON user_integrations;
  CREATE POLICY user_integrations_owner_scope ON user_integrations
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS tasks_owner_scope ON tasks;
  CREATE POLICY tasks_owner_scope ON tasks
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS schedule_items_owner_scope ON schedule_items;
  CREATE POLICY schedule_items_owner_scope ON schedule_items
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS notes_owner_scope ON notes;
  CREATE POLICY notes_owner_scope ON notes
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS captures_owner_scope ON captures;
  CREATE POLICY captures_owner_scope ON captures
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS reminders_owner_scope ON reminders;
  CREATE POLICY reminders_owner_scope ON reminders
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS reminder_preferences_owner_scope ON reminder_preferences;
  CREATE POLICY reminder_preferences_owner_scope ON reminder_preferences
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS content_items_owner_scope ON content_items;
  CREATE POLICY content_items_owner_scope ON content_items
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS course_jobs_owner_scope ON course_jobs;
  CREATE POLICY course_jobs_owner_scope ON course_jobs
    FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())
    WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner());

  DROP POLICY IF EXISTS content_versions_parent_owner ON content_versions;
  CREATE POLICY content_versions_parent_owner ON content_versions FOR ALL
    USING (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));
  DROP POLICY IF EXISTS content_access_parent_owner ON content_access;
  CREATE POLICY content_access_parent_owner ON content_access FOR ALL
    USING (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));
  DROP POLICY IF EXISTS content_display_parent_owner ON content_display;
  CREATE POLICY content_display_parent_owner ON content_display FOR ALL
    USING (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));
  DROP POLICY IF EXISTS content_assets_parent_owner ON content_assets;
  CREATE POLICY content_assets_parent_owner ON content_assets FOR ALL
    USING (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));
  DROP POLICY IF EXISTS share_links_parent_owner ON share_links;
  CREATE POLICY share_links_parent_owner ON share_links FOR ALL
    USING (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from content_items item where item.id = item_id and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));

  DROP POLICY IF EXISTS course_assets_parent_owner ON course_assets;
  CREATE POLICY course_assets_parent_owner ON course_assets FOR ALL
    USING (exists(select 1 from course_jobs job where job.id = job_id and (job.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from course_jobs job where job.id = job_id and (job.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));
  DROP POLICY IF EXISTS course_lessons_parent_owner ON course_lessons;
  CREATE POLICY course_lessons_parent_owner ON course_lessons FOR ALL
    USING (exists(select 1 from course_jobs job where job.id = job_id and (job.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from course_jobs job where job.id = job_id and (job.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));

  DROP POLICY IF EXISTS reminder_events_parent_owner ON reminder_events;
  CREATE POLICY reminder_events_parent_owner ON reminder_events FOR ALL
    USING (exists(select 1 from reminders reminder where reminder.id = reminder_id and (reminder.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))
    WITH CHECK (exists(select 1 from reminders reminder where reminder.id = reminder_id and (reminder.owner_id = law_tech_current_profile_id() or law_tech_is_owner())));
END $$;

-- Optional legacy workspace tables. Policies are installed only when the
-- corresponding table exists, so current deployments are not forced to create
-- unused placeholder relations.
DO $$
BEGIN
  IF to_regclass('public.materials') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS materials_owner_scope ON public.materials';
    EXECUTE 'CREATE POLICY materials_owner_scope ON public.materials FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner()) WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())';
  END IF;

  IF to_regclass('public.courses') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS courses_owner_scope ON public.courses';
    EXECUTE 'CREATE POLICY courses_owner_scope ON public.courses FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner()) WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())';
  END IF;

  IF to_regclass('public.course_sessions') IS NOT NULL AND to_regclass('public.courses') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS course_sessions_parent_owner ON public.course_sessions';
    EXECUTE 'CREATE POLICY course_sessions_parent_owner ON public.course_sessions FOR ALL USING (exists(select 1 from public.courses course where course.id = course_id and (course.owner_id = law_tech_current_profile_id() or law_tech_is_owner()))) WITH CHECK (exists(select 1 from public.courses course where course.id = course_id and (course.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))';
  END IF;

  IF to_regclass('public.workflows') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS workflows_owner_scope ON public.workflows';
    EXECUTE 'CREATE POLICY workflows_owner_scope ON public.workflows FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner()) WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())';
  END IF;

  IF to_regclass('public.workflow_steps') IS NOT NULL AND to_regclass('public.workflows') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS workflow_steps_parent_owner ON public.workflow_steps';
    EXECUTE 'CREATE POLICY workflow_steps_parent_owner ON public.workflow_steps FOR ALL USING (exists(select 1 from public.workflows flow where flow.id = workflow_id and (flow.owner_id = law_tech_current_profile_id() or law_tech_is_owner()))) WITH CHECK (exists(select 1 from public.workflows flow where flow.id = workflow_id and (flow.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))';
  END IF;

  IF to_regclass('public.publishables') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS publishables_owner_scope ON public.publishables';
    EXECUTE 'CREATE POLICY publishables_owner_scope ON public.publishables FOR ALL USING (owner_id = law_tech_current_profile_id() OR law_tech_is_owner()) WITH CHECK (owner_id = law_tech_current_profile_id() OR law_tech_is_owner())';
  END IF;

  IF to_regclass('public.shares') IS NOT NULL AND to_regclass('public.publishables') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS shares_parent_owner ON public.shares';
    EXECUTE 'CREATE POLICY shares_parent_owner ON public.shares FOR ALL USING (exists(select 1 from public.publishables publication where publication.id = publishable_id and (publication.owner_id = law_tech_current_profile_id() or law_tech_is_owner()))) WITH CHECK (exists(select 1 from public.publishables publication where publication.id = publishable_id and (publication.owner_id = law_tech_current_profile_id() or law_tech_is_owner())))';
  END IF;
END $$;

