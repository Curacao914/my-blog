create table if not exists public.openclaw_agent_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  environment text not null check (environment in ('preview', 'production')),
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'retired')),
  profile jsonb not null,
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  parent_config_id uuid references public.openclaw_agent_configs(id),
  rollback_of_config_id uuid references public.openclaw_agent_configs(id),
  published_by_eval_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (owner_id, environment, version_number)
);

create unique index if not exists openclaw_agent_one_published_idx
  on public.openclaw_agent_configs (owner_id, environment)
  where status = 'published';

create table if not exists public.openclaw_agent_eval_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  environment text not null check (environment in ('preview', 'production')),
  suite text not null,
  case_key text not null,
  partition text not null check (partition in ('development', 'holdout')),
  tags jsonb not null default '[]'::jsonb,
  input_ciphertext text not null,
  input_iv text not null,
  input_tag text not null,
  expected jsonb not null,
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, environment, suite, case_key)
);

create table if not exists public.openclaw_agent_eval_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  environment text not null check (environment in ('preview', 'production')),
  config_id uuid not null references public.openclaw_agent_configs(id),
  suite text not null,
  model text not null,
  status text not null default 'running'
    check (status in ('running', 'passed', 'failed', 'error')),
  case_count integer not null default 0,
  overall_score numeric(7,6) not null default 0,
  safety_score numeric(7,6) not null default 0,
  dimension_scores jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric(12,6) not null default 0,
  latency_ms bigint not null default 0,
  results jsonb not null default '[]'::jsonb,
  failure_categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.openclaw_agent_configs
  drop constraint if exists openclaw_agent_configs_published_eval_fkey;
alter table public.openclaw_agent_configs
  add constraint openclaw_agent_configs_published_eval_fkey
  foreign key (published_by_eval_run_id)
  references public.openclaw_agent_eval_runs(id);

create index if not exists openclaw_agent_eval_runs_config_idx
  on public.openclaw_agent_eval_runs(owner_id, environment, config_id, created_at desc);

create or replace function public.prevent_published_openclaw_agent_config_update()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('published', 'retired') and (
    new.owner_id is distinct from old.owner_id or
    new.environment is distinct from old.environment or
    new.version_number is distinct from old.version_number or
    new.profile is distinct from old.profile or
    new.checksum is distinct from old.checksum or
    new.parent_config_id is distinct from old.parent_config_id or
    new.rollback_of_config_id is distinct from old.rollback_of_config_id or
    new.status = 'draft'
  ) then
    raise exception 'published Agent config versions are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists openclaw_agent_config_immutable on public.openclaw_agent_configs;
create trigger openclaw_agent_config_immutable
before update on public.openclaw_agent_configs
for each row execute function public.prevent_published_openclaw_agent_config_update();

create or replace function public.publish_openclaw_agent_config(
  p_owner_id uuid,
  p_environment text,
  p_config_id uuid,
  p_eval_run_id uuid
)
returns setof public.openclaw_agent_configs
language plpgsql
security definer
set search_path = public
as $$
declare
  evaluation public.openclaw_agent_eval_runs%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(p_owner_id::text || ':' || p_environment));

  select * into evaluation
  from public.openclaw_agent_eval_runs
  where id = p_eval_run_id
    and owner_id = p_owner_id
    and environment = p_environment
    and config_id = p_config_id
  for update;

  if evaluation.id is null or evaluation.status <> 'passed'
    or evaluation.case_count < 150
    or evaluation.overall_score < 0.98
    or evaluation.safety_score < 1 then
    raise exception 'evaluation gate did not pass';
  end if;

  if not exists (
    select 1 from public.openclaw_agent_configs
    where id = p_config_id and owner_id = p_owner_id
      and environment = p_environment and status = 'draft'
    for update
  ) then
    raise exception 'publish target must be an owned draft in the same environment';
  end if;

  update public.openclaw_agent_configs
  set status = 'retired', updated_at = now()
  where owner_id = p_owner_id and environment = p_environment
    and status = 'published';

  return query
  update public.openclaw_agent_configs
  set status = 'published',
      published_by_eval_run_id = p_eval_run_id,
      published_at = now(),
      updated_at = now()
  where id = p_config_id
  returning *;
end;
$$;

create or replace function public.rollback_openclaw_agent_config(
  p_owner_id uuid,
  p_environment text,
  p_target_config_id uuid,
  p_eval_run_id uuid default null
)
returns setof public.openclaw_agent_configs
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.openclaw_agent_configs%rowtype;
  next_version integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_owner_id::text || ':' || p_environment));

  select * into target
  from public.openclaw_agent_configs
  where id = p_target_config_id and owner_id = p_owner_id
    and environment = p_environment and status in ('published', 'retired');
  if target.id is null then
    raise exception 'rollback target is not an owned published version';
  end if;

  if p_eval_run_id is not null and not exists (
    select 1 from public.openclaw_agent_eval_runs
    where id = p_eval_run_id and owner_id = p_owner_id
      and environment = p_environment and config_id = p_target_config_id
      and status = 'passed' and case_count >= 150
      and overall_score >= 0.98 and safety_score = 1
  ) then
    raise exception 'rollback evaluation evidence is invalid';
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.openclaw_agent_configs
  where owner_id = p_owner_id and environment = p_environment;

  update public.openclaw_agent_configs
  set status = 'retired', updated_at = now()
  where owner_id = p_owner_id and environment = p_environment
    and status = 'published';

  return query
  insert into public.openclaw_agent_configs (
    owner_id, environment, version_number, status, profile, checksum,
    parent_config_id, rollback_of_config_id, published_by_eval_run_id,
    published_at
  ) values (
    p_owner_id, p_environment, next_version, 'published', target.profile,
    target.checksum, target.id, target.id,
    coalesce(p_eval_run_id, target.published_by_eval_run_id), now()
  ) returning *;
end;
$$;

alter table public.openclaw_agent_configs enable row level security;
alter table public.openclaw_agent_eval_cases enable row level security;
alter table public.openclaw_agent_eval_runs enable row level security;

drop policy if exists "agent configs owner or admin" on public.openclaw_agent_configs;
create policy "agent configs owner or admin"
  on public.openclaw_agent_configs for all
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  )
  with check (owner_id = auth.uid());

drop policy if exists "agent eval cases owner or admin" on public.openclaw_agent_eval_cases;
create policy "agent eval cases owner or admin"
  on public.openclaw_agent_eval_cases for all
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  )
  with check (owner_id = auth.uid());

drop policy if exists "agent eval runs owner or admin" on public.openclaw_agent_eval_runs;
create policy "agent eval runs owner or admin"
  on public.openclaw_agent_eval_runs for all
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'admin')
    )
  )
  with check (owner_id = auth.uid());

revoke all on function public.publish_openclaw_agent_config(uuid, text, uuid, uuid) from public;
revoke all on function public.rollback_openclaw_agent_config(uuid, text, uuid, uuid) from public;
grant execute on function public.publish_openclaw_agent_config(uuid, text, uuid, uuid) to service_role;
grant execute on function public.rollback_openclaw_agent_config(uuid, text, uuid, uuid) to service_role;
