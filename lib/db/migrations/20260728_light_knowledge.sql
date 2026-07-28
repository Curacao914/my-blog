begin;

create extension if not exists pg_trgm;

alter table public.content_items
  drop constraint if exists content_items_type_check;

alter table public.content_items
  add constraint content_items_type_check
  check (type in ('article', 'course-note', 'reading-note', 'project', 'page', 'knowledge'));

alter table public.content_items
  drop constraint if exists content_items_knowledge_draft_check;

alter table public.content_items
  add constraint content_items_knowledge_draft_check
  check (type <> 'knowledge' or status = 'draft');

create table if not exists public.knowledge_entries (
  item_id uuid primary key references public.content_items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'idea' check (
    kind in ('question', 'concept', 'idea', 'fact', 'observation', 'quote', 'connection')
  ),
  state text not null default 'exploring' check (
    state in ('exploring', 'active', 'archived')
  ),
  domain text,
  topic text,
  seed_text text,
  review_status text not null default 'needs_review' check (
    review_status in ('needs_review', 'reviewed')
  ),
  provenance jsonb not null default '[]'::jsonb,
  show_on_home boolean not null default false,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  source_item_id uuid not null references public.content_items(id) on delete cascade,
  target_type text not null check (
    target_type in ('knowledge', 'note', 'reading', 'course', 'writing', 'today')
  ),
  target_id text not null,
  relation_type text not null check (
    relation_type in ('related', 'derived_from', 'developed_into', 'supports', 'challenges')
  ),
  origin text not null default 'user' check (
    origin in ('rule', 'import', 'user')
  ),
  status text not null default 'suggested' check (
    status in ('suggested', 'confirmed', 'dismissed')
  ),
  score double precision check (
    score is null or (score >= 0 and score <= 1)
  ),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_item_id, target_type, target_id, relation_type)
);

create table if not exists public.knowledge_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.content_items(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  ),
  size_bytes bigint not null check (
    size_bytes > 0 and size_bytes <= 2097152
  ),
  checksum text not null,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_knowledge_entries_owner_state_updated
  on public.knowledge_entries (owner_id, state, updated_at desc);

create index if not exists idx_knowledge_entries_search_text_trgm
  on public.knowledge_entries using gin (search_text gin_trgm_ops);

create index if not exists idx_knowledge_links_owner_source
  on public.knowledge_links (owner_id, source_item_id, status);

create index if not exists idx_knowledge_assets_owner_item
  on public.knowledge_assets (owner_id, item_id, created_at desc);

update public.content_access access
set mode = 'private',
    allow_indexing = false,
    allow_rss = false,
    allow_sitemap = false,
    updated_at = now()
from public.content_items item
where item.id = access.item_id
  and item.type = 'knowledge'
  and (
    access.mode is distinct from 'private'
    or access.allow_indexing is distinct from false
    or access.allow_rss is distinct from false
    or access.allow_sitemap is distinct from false
  );

create or replace function law_tech_enforce_knowledge_private_access()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_type text;
begin
  if TG_TABLE_NAME = 'content_access' then
    select item.type
    into parent_type
    from public.content_items item
    where item.id = new.item_id
    for update;

    if parent_type = 'knowledge' and (
      new.mode is distinct from 'private'
      or new.allow_indexing is distinct from false
      or new.allow_rss is distinct from false
      or new.allow_sitemap is distinct from false
    ) then
      raise exception 'knowledge content access must remain private and undiscoverable'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if TG_TABLE_NAME = 'content_items'
    and old.type is distinct from 'knowledge'
    and new.type = 'knowledge'
    and exists (
      select 1
      from public.content_access access
      where access.item_id = new.id
        and (
          access.mode is distinct from 'private'
          or access.allow_indexing is distinct from false
          or access.allow_rss is distinct from false
          or access.allow_sitemap is distinct from false
        )
    )
  then
    raise exception 'content access must be private before changing an item to knowledge'
      using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists content_access_knowledge_private_guard on public.content_access;
create trigger content_access_knowledge_private_guard
  before insert or update on public.content_access
  for each row
  execute function law_tech_enforce_knowledge_private_access();

drop trigger if exists content_items_knowledge_private_guard on public.content_items;
create trigger content_items_knowledge_private_guard
  before update of type on public.content_items
  for each row
  execute function law_tech_enforce_knowledge_private_access();

alter table public.knowledge_entries enable row level security;
alter table public.knowledge_links enable row level security;
alter table public.knowledge_assets enable row level security;

drop policy if exists knowledge_entries_owner_scope on public.knowledge_entries;
create policy knowledge_entries_owner_scope on public.knowledge_entries
  for all
  using (
    (owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    and exists (
      select 1
      from public.content_items item
      where item.id = item_id
        and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    )
  )
  with check (
    (owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    and exists (
      select 1
      from public.content_items item
      where item.id = item_id
        and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    )
  );

drop policy if exists knowledge_links_owner_scope on public.knowledge_links;
create policy knowledge_links_owner_scope on public.knowledge_links
  for all
  using (
    (owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    and exists (
      select 1
      from public.content_items item
      where item.id = source_item_id
        and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    )
  )
  with check (
    (owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    and exists (
      select 1
      from public.content_items item
      where item.id = source_item_id
        and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    )
  );

drop policy if exists knowledge_assets_parent_owner on public.knowledge_assets;
create policy knowledge_assets_parent_owner on public.knowledge_assets
  for all
  using (
    (owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    and exists (
      select 1
      from public.content_items item
      where item.id = item_id
        and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    )
  )
  with check (
    (owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    and exists (
      select 1
      from public.content_items item
      where item.id = item_id
        and (item.owner_id = law_tech_current_profile_id() or law_tech_is_owner())
    )
  );

commit;
