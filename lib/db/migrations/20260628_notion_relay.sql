-- Last-known-good Notion relay.
-- Apply after the existing content and multi-user migrations.

create extension if not exists pgcrypto;

create table if not exists notion_relay_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'staging'
    check (status in ('staging', 'active', 'superseded', 'failed')),
  source_site_id text,
  site_data jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  error text,
  triggered_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  promoted_at timestamptz
);

create table if not exists notion_relay_snapshots (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  checksum text not null,
  post_data jsonb not null,
  block_map jsonb not null,
  asset_manifest jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(page_id, checksum)
);

create table if not exists notion_relay_batch_pages (
  batch_id uuid not null references notion_relay_batches(id) on delete cascade,
  page_id text not null,
  slug text not null,
  title text,
  snapshot_id uuid not null references notion_relay_snapshots(id) on delete restrict,
  sort_order integer not null default 0,
  primary key(batch_id, page_id),
  unique(batch_id, slug)
);

create table if not exists notion_relay_state (
  singleton boolean primary key default true check (singleton),
  active_batch_id uuid references notion_relay_batches(id) on delete restrict,
  previous_batch_id uuid references notion_relay_batches(id) on delete restrict,
  updated_at timestamptz not null default now()
);

insert into notion_relay_state(singleton)
values (true)
on conflict (singleton) do nothing;

create index if not exists idx_notion_relay_batches_status
  on notion_relay_batches(status, created_at desc);
create index if not exists idx_notion_relay_snapshots_page
  on notion_relay_snapshots(page_id, created_at desc);
create index if not exists idx_notion_relay_batch_pages_slug
  on notion_relay_batch_pages(batch_id, slug);
create index if not exists idx_notion_relay_batch_pages_snapshot
  on notion_relay_batch_pages(snapshot_id);

create or replace function promote_notion_relay_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_batch uuid;
  page_total integer;
begin
  select count(*) into page_total
  from notion_relay_batch_pages
  where batch_id = p_batch_id;

  if page_total = 0 then
    raise exception 'Cannot promote an empty Notion relay batch';
  end if;

  if not exists (
    select 1 from notion_relay_batches
    where id = p_batch_id and status = 'staging'
  ) then
    raise exception 'Notion relay batch is missing or is not staging';
  end if;

  select active_batch_id into old_batch
  from notion_relay_state
  where singleton = true
  for update;

  update notion_relay_state
  set previous_batch_id = old_batch,
      active_batch_id = p_batch_id,
      updated_at = now()
  where singleton = true;

  update notion_relay_batches
  set status = 'superseded',
      completed_at = coalesce(completed_at, now())
  where id = old_batch and id <> p_batch_id;

  update notion_relay_batches
  set status = 'active',
      completed_at = now(),
      promoted_at = now(),
      error = null
  where id = p_batch_id;

  return jsonb_build_object(
    'active_batch_id', p_batch_id,
    'previous_batch_id', old_batch,
    'page_count', page_total
  );
end
$$;

revoke all on function promote_notion_relay_batch(uuid) from public;
revoke all on function promote_notion_relay_batch(uuid) from anon;
revoke all on function promote_notion_relay_batch(uuid) from authenticated;
grant execute on function promote_notion_relay_batch(uuid) to service_role;

alter table notion_relay_batches enable row level security;
alter table notion_relay_snapshots enable row level security;
alter table notion_relay_batch_pages enable row level security;
alter table notion_relay_state enable row level security;

-- No browser policies are created. Relay data is read and written only by
-- server code using the Supabase service role.
