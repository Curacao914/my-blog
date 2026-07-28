begin;

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

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

  if TG_TABLE_NAME = 'content_items' then
    if old.type = 'knowledge' and (
      new.type is distinct from 'knowledge'
      or new.owner_id is distinct from old.owner_id
    ) then
      raise exception 'knowledge content item type and owner are immutable'
        using errcode = '23514';
    end if;

    if old.type is distinct from 'knowledge'
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
  before update of type, owner_id on public.content_items
  for each row
  execute function law_tech_enforce_knowledge_private_access();

create or replace function law_tech_enforce_knowledge_parent()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_item_id uuid;
  parent_type text;
  parent_owner_id uuid;
begin
  if TG_TABLE_NAME = 'knowledge_links' then
    parent_item_id := new.source_item_id;
  else
    parent_item_id := new.item_id;
  end if;

  select item.type, item.owner_id
  into parent_type, parent_owner_id
  from public.content_items item
  where item.id = parent_item_id
  for update;

  if not found then
    raise exception 'knowledge parent content item does not exist'
      using errcode = '23503';
  end if;

  if parent_type is distinct from 'knowledge' then
    raise exception 'knowledge records require a knowledge content item'
      using errcode = '23514';
  end if;

  if parent_owner_id is null
    or new.owner_id is distinct from parent_owner_id
  then
    raise exception 'knowledge record owner must match its content item owner'
      using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists knowledge_entries_parent_guard on public.knowledge_entries;
create trigger knowledge_entries_parent_guard
  before insert or update on public.knowledge_entries
  for each row
  execute function law_tech_enforce_knowledge_parent();

drop trigger if exists knowledge_links_parent_guard on public.knowledge_links;
create trigger knowledge_links_parent_guard
  before insert or update on public.knowledge_links
  for each row
  execute function law_tech_enforce_knowledge_parent();

drop trigger if exists knowledge_assets_parent_guard on public.knowledge_assets;
create trigger knowledge_assets_parent_guard
  before insert or update on public.knowledge_assets
  for each row
  execute function law_tech_enforce_knowledge_parent();

create or replace function public.law_tech_update_knowledge_entry(
  p_owner_id uuid,
  p_item_id uuid,
  p_patch jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_item public.content_items%rowtype;
  v_entry public.knowledge_entries%rowtype;
  v_display public.content_display%rowtype;
  v_version public.content_versions%rowtype;
  v_now timestamptz := now();
  v_title text;
  v_summary text;
  v_body_markdown text;
  v_kind text;
  v_state text;
  v_domain text;
  v_topic text;
  v_seed_text text;
  v_tags text[];
  v_review_status text;
  v_provenance jsonb;
  v_show_on_home boolean;
  v_checksum text;
  v_next_version integer;
  v_search_text text;
begin
  p_patch := coalesce(p_patch, '{}'::jsonb);

  select item.*
  into v_item
  from public.content_items item
  where item.id = p_item_id
    and item.owner_id = p_owner_id
    and item.type = 'knowledge'
  for update;

  if not found then
    raise exception 'knowledge entry not found'
      using errcode = 'P0002';
  end if;

  select entry.*
  into v_entry
  from public.knowledge_entries entry
  where entry.item_id = p_item_id
    and entry.owner_id = p_owner_id;

  if not found then
    raise exception 'knowledge entry not found'
      using errcode = 'P0002';
  end if;

  select display.*
  into v_display
  from public.content_display display
  where display.item_id = p_item_id;

  if not found then
    raise exception 'knowledge entry not found'
      using errcode = 'P0002';
  end if;

  select version.*
  into v_version
  from public.content_versions version
  where version.item_id = p_item_id
  order by version.version desc
  limit 1;

  if not found then
    raise exception 'knowledge entry not found'
      using errcode = 'P0002';
  end if;

  v_title := v_item.title;
  v_summary := coalesce(v_item.summary, '');
  v_body_markdown := v_version.body_markdown;
  v_kind := v_entry.kind;
  v_state := v_entry.state;
  v_domain := v_entry.domain;
  v_topic := v_entry.topic;
  v_seed_text := v_entry.seed_text;
  v_tags := v_display.tags;
  v_review_status := v_entry.review_status;
  v_provenance := v_entry.provenance;
  v_show_on_home := v_entry.show_on_home;

  if p_patch ? 'title' then
    v_title := btrim(coalesce(p_patch->>'title', ''));
    if v_title = '' then
      raise exception 'knowledge title is required'
        using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'summary' then
    v_summary := btrim(coalesce(p_patch->>'summary', ''));
  end if;

  if p_patch ? 'body_markdown' then
    v_body_markdown := btrim(coalesce(p_patch->>'body_markdown', ''));
    if v_body_markdown = '' then
      raise exception 'knowledge body is required'
        using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'kind' then
    v_kind := p_patch->>'kind';
    if not (
      v_kind = any (
        array['question', 'concept', 'idea', 'fact', 'observation', 'quote', 'connection']
      )
    ) then
      raise exception 'invalid knowledge kind'
        using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'state' then
    v_state := p_patch->>'state';
    if not (v_state = any (array['exploring', 'active', 'archived'])) then
      raise exception 'invalid knowledge state'
        using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'domain' then
    v_domain := nullif(btrim(coalesce(p_patch->>'domain', '')), '');
  end if;

  if p_patch ? 'topic' then
    v_topic := nullif(btrim(coalesce(p_patch->>'topic', '')), '');
  end if;

  if p_patch ? 'seed_text' then
    v_seed_text := nullif(btrim(coalesce(p_patch->>'seed_text', '')), '');
  end if;

  if p_patch ? 'tags' then
    if jsonb_typeof(p_patch->'tags') is distinct from 'array'
      or exists (
        select 1
        from jsonb_array_elements(p_patch->'tags') as tag(value)
        where jsonb_typeof(value) is distinct from 'string'
      )
    then
      raise exception 'invalid knowledge tags'
        using errcode = '22023';
    end if;

    select coalesce(
      array_agg(btrim(value) order by ordinality)
        filter (where btrim(value) <> ''),
      '{}'::text[]
    )
    into v_tags
    from jsonb_array_elements_text(p_patch->'tags')
      with ordinality as tag(value, ordinality);
  end if;

  if p_patch ? 'review_status' then
    v_review_status := p_patch->>'review_status';
    if not (
      v_review_status = any (array['needs_review', 'reviewed'])
    ) then
      raise exception 'invalid knowledge review status'
        using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'provenance' then
    if jsonb_typeof(p_patch->'provenance') is distinct from 'array' then
      raise exception 'invalid knowledge provenance'
        using errcode = '22023';
    end if;
    v_provenance := p_patch->'provenance';
  end if;

  if p_patch ? 'show_on_home' then
    if jsonb_typeof(p_patch->'show_on_home') is distinct from 'boolean' then
      raise exception 'invalid knowledge home visibility'
        using errcode = '22023';
    end if;
    v_show_on_home := (p_patch->>'show_on_home')::boolean;
  end if;

  update public.content_items
  set title = case when p_patch ? 'title' then v_title else title end,
      summary = case
        when p_patch ? 'summary' then nullif(v_summary, '')
        else summary
      end,
      updated_at = v_now
  where id = p_item_id
    and owner_id = p_owner_id
    and type = 'knowledge';

  v_checksum := encode(digest(v_body_markdown, 'sha256'), 'hex');
  if p_patch ? 'body_markdown'
    and v_checksum is distinct from v_version.checksum
  then
    select coalesce(max(version), 0) + 1
    into v_next_version
    from public.content_versions
    where item_id = p_item_id;

    insert into public.content_versions (
      item_id,
      version,
      body_markdown,
      checksum,
      is_published
    )
    values (
      p_item_id,
      v_next_version,
      v_body_markdown,
      v_checksum,
      false
    );
  end if;

  insert into public.content_access (
    item_id,
    mode,
    password_hash,
    expires_at,
    allow_indexing,
    allow_rss,
    allow_sitemap,
    updated_at
  )
  values (
    p_item_id,
    'private',
    null,
    null,
    false,
    false,
    false,
    v_now
  )
  on conflict (item_id)
  do update set
    mode = 'private',
    password_hash = null,
    expires_at = null,
    allow_indexing = false,
    allow_rss = false,
    allow_sitemap = false,
    updated_at = excluded.updated_at;

  if p_patch ? 'tags' or p_patch ? 'domain' then
    update public.content_display
    set tags = case when p_patch ? 'tags' then v_tags else tags end,
        folder_path = case
          when p_patch ? 'domain' then
            case
              when v_domain is null then array['轻知识']::text[]
              else array['轻知识', v_domain]::text[]
            end
          else folder_path
        end,
        updated_at = v_now
    where item_id = p_item_id;
  end if;

  v_search_text := regexp_replace(
    btrim(
      concat_ws(
        ' ',
        v_title,
        v_summary,
        v_body_markdown,
        v_domain,
        v_topic,
        array_to_string(v_tags, ' '),
        v_seed_text
      )
    ),
    '\s+',
    ' ',
    'g'
  );

  update public.knowledge_entries
  set kind = case when p_patch ? 'kind' then v_kind else kind end,
      state = case when p_patch ? 'state' then v_state else state end,
      domain = case when p_patch ? 'domain' then v_domain else domain end,
      topic = case when p_patch ? 'topic' then v_topic else topic end,
      seed_text = case
        when p_patch ? 'seed_text' then v_seed_text
        else seed_text
      end,
      review_status = case
        when p_patch ? 'review_status' then v_review_status
        else review_status
      end,
      provenance = case
        when p_patch ? 'provenance' then v_provenance
        else provenance
      end,
      show_on_home = case
        when p_patch ? 'show_on_home' then v_show_on_home
        else show_on_home
      end,
      search_text = v_search_text,
      updated_at = v_now
  where item_id = p_item_id
    and owner_id = p_owner_id;

  return p_item_id;
end
$$;

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
