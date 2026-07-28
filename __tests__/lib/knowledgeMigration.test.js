const fs = require('fs')
const path = require('path')

describe('light knowledge database migration', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'lib/db/migrations/20260728_light_knowledge.sql'),
    'utf8'
  )
  const schema = fs.readFileSync(
    path.join(process.cwd(), 'lib/db/schema.sql'),
    'utf8'
  )

  it('creates exactly the three approved knowledge tables in the migration and schema', () => {
    const migrationTables = Array.from(
      migration.matchAll(/create table if not exists (?:public\.)?(knowledge_[a-z_]+)/gi),
      match => match[1]
    )

    expect(migrationTables).toEqual([
      'knowledge_entries',
      'knowledge_links',
      'knowledge_assets'
    ])
    for (const table of migrationTables) {
      expect(schema).toMatch(new RegExp(`create table if not exists ${table}`, 'i'))
    }
  })

  it('safely expands the content item type while fresh installs include knowledge', () => {
    expect(migration).toMatch(/drop constraint if exists content_items_type_check/i)
    expect(migration).toMatch(
      /add constraint content_items_type_check[\s\S]+type in \([\s\S]*'knowledge'/i
    )
    expect(migration).toMatch(
      /add constraint content_items_knowledge_draft_check[\s\S]+type <> 'knowledge' or status = 'draft'/i
    )
    expect(schema).toMatch(
      /type text not null check \(type in \([\s\S]*'knowledge'/i
    )
    expect(schema).toMatch(
      /constraint content_items_knowledge_draft_check[\s\S]+type <> 'knowledge' or status = 'draft'/i
    )
  })

  it('defines approved enums, provenance and asset safety constraints', () => {
    expect(migration).toMatch(
      /kind text not null[\s\S]+question[\s\S]+concept[\s\S]+idea[\s\S]+fact[\s\S]+observation[\s\S]+quote[\s\S]+connection/i
    )
    expect(migration).toMatch(
      /state text not null[\s\S]+exploring[\s\S]+active[\s\S]+archived/i
    )
    expect(migration).toMatch(
      /review_status text not null[\s\S]+needs_review[\s\S]+reviewed/i
    )
    expect(migration).toMatch(/provenance jsonb not null default '\[\]'::jsonb/i)
    expect(migration).toMatch(
      /target_type text not null[\s\S]+knowledge[\s\S]+note[\s\S]+reading[\s\S]+course[\s\S]+writing[\s\S]+today/i
    )
    expect(migration).toMatch(
      /relation_type text not null[\s\S]+related[\s\S]+derived_from[\s\S]+developed_into[\s\S]+supports[\s\S]+challenges/i
    )
    expect(migration).toMatch(/score[\s\S]+score >= 0[\s\S]+score <= 1/i)
    expect(migration).toMatch(
      /mime_type text not null[\s\S]+image\/jpeg[\s\S]+image\/png[\s\S]+image\/webp[\s\S]+image\/gif/i
    )
    expect(migration).toMatch(
      /size_bytes bigint not null[\s\S]+size_bytes > 0[\s\S]+size_bytes <= 2097152/i
    )
    expect(migration).toMatch(/storage_path text not null unique/i)
  })

  it('adds trigram search and owner-scoped indexes without a vector service', () => {
    expect(migration).toMatch(/create extension if not exists pg_trgm/i)
    expect(migration).toMatch(
      /knowledge_entries[\s\S]+owner_id,\s*state,\s*updated_at desc/i
    )
    expect(migration).toMatch(
      /using gin\s*\(search_text gin_trgm_ops\)/i
    )
    expect(`${migration}\n${schema}`).not.toMatch(/pgvector|vector\s*\(/i)
    expect(`${migration}\n${schema}`).not.toMatch(
      /create table if not exists (?:public\.)?knowledge_(?:sources|provenance)/i
    )
  })

  it('enables RLS and provisions only the approved private storage bucket', () => {
    for (const table of ['knowledge_entries', 'knowledge_links', 'knowledge_assets']) {
      expect(migration).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, 'i')
      )
      expect(migration).toMatch(
        new RegExp(`drop policy if exists ${table}_(?:owner_scope|parent_owner)`, 'i')
      )
    }
    expect(migration).toContain('law_tech_current_profile_id()')
    expect(migration).toContain('law_tech_is_owner()')
    expect(migration).toMatch(
      /insert into storage\.buckets[\s\S]+knowledge-assets[\s\S]+public[\s\S]+false[\s\S]+2097152[\s\S]+image\/jpeg[\s\S]+image\/png[\s\S]+image\/webp[\s\S]+image\/gif/i
    )
    expect(migration).toMatch(
      /on conflict \(id\) do update[\s\S]+public = false[\s\S]+file_size_limit = 2097152[\s\S]+allowed_mime_types/i
    )
    expect(migration).not.toMatch(
      /create policy[\s\S]+on storage\.objects/i
    )
    expect(schema).not.toMatch(/storage\.buckets|knowledge-assets/i)
  })

  it('normalizes existing knowledge access before installing the private guard', () => {
    const normalizationPosition = migration.indexOf('update public.content_access access')
    const triggerPosition = migration.indexOf('create trigger content_access_knowledge_private_guard')

    expect(normalizationPosition).toBeGreaterThan(-1)
    expect(triggerPosition).toBeGreaterThan(normalizationPosition)
    expect(migration).toMatch(
      /update public\.content_access access[\s\S]+set mode = 'private'[\s\S]+allow_indexing = false[\s\S]+allow_rss = false[\s\S]+allow_sitemap = false[\s\S]+item\.type = 'knowledge'/i
    )
  })

  it('guards access writes and item type transitions with one reusable trigger function', () => {
    for (const sql of [migration, schema]) {
      expect(sql).toMatch(
        /create or replace function law_tech_enforce_knowledge_private_access\(\)[\s\S]+returns trigger/i
      )
      expect(sql).toMatch(
        /parent_type = 'knowledge'[\s\S]+new\.mode is distinct from 'private'[\s\S]+new\.allow_indexing is distinct from false[\s\S]+new\.allow_rss is distinct from false[\s\S]+new\.allow_sitemap is distinct from false[\s\S]+raise exception/i
      )
      expect(sql).toMatch(
        /create trigger content_access_knowledge_private_guard[\s\S]+before insert or update on (?:public\.)?content_access[\s\S]+execute function law_tech_enforce_knowledge_private_access\(\)/i
      )
      expect(sql).toMatch(
        /create trigger content_items_knowledge_private_guard[\s\S]+before update of type,\s*owner_id on (?:public\.)?content_items[\s\S]+execute function law_tech_enforce_knowledge_private_access\(\)/i
      )
      expect(sql).toMatch(
        /old\.type is distinct from 'knowledge'[\s\S]+new\.type = 'knowledge'[\s\S]+from (?:public\.)?content_access access[\s\S]+access\.mode is distinct from 'private'[\s\S]+raise exception/i
      )
    }
  })

  it('keeps knowledge item identity and ownership immutable after child creation', () => {
    for (const sql of [migration, schema]) {
      expect(sql).toMatch(
        /TG_TABLE_NAME = 'content_items'[\s\S]+old\.type = 'knowledge'[\s\S]+new\.type is distinct from 'knowledge'[\s\S]+new\.owner_id is distinct from old\.owner_id[\s\S]+raise exception/i
      )
      expect(sql).toMatch(
        /create trigger content_items_knowledge_private_guard[\s\S]+before update of type,\s*owner_id on (?:public\.)?content_items[\s\S]+execute function law_tech_enforce_knowledge_private_access\(\)/i
      )
    }
  })

  it('guards every knowledge child with a knowledge parent owned by the same profile', () => {
    for (const sql of [migration, schema]) {
      expect(sql).toMatch(
        /create or replace function law_tech_enforce_knowledge_parent\(\)[\s\S]+returns trigger/i
      )
      expect(sql).toMatch(
        /TG_TABLE_NAME = 'knowledge_links'[\s\S]+parent_item_id := new\.source_item_id[\s\S]+parent_item_id := new\.item_id/i
      )
      expect(sql).toMatch(
        /select item\.type,\s*item\.owner_id[\s\S]+into parent_type,\s*parent_owner_id[\s\S]+where item\.id = parent_item_id[\s\S]+if not found[\s\S]+raise exception/i
      )
      expect(sql).toMatch(
        /parent_type is distinct from 'knowledge'[\s\S]+raise exception/i
      )
      expect(sql).toMatch(
        /new\.owner_id is distinct from parent_owner_id[\s\S]+raise exception/i
      )

      for (const table of ['knowledge_entries', 'knowledge_links', 'knowledge_assets']) {
        expect(sql).toMatch(
          new RegExp(
            `create trigger ${table}_parent_guard[\\s\\S]+before insert or update on (?:public\\.)?${table}[\\s\\S]+execute function law_tech_enforce_knowledge_parent\\(\\)`,
            'i'
          )
        )
      }
    }
  })

  it('updates knowledge atomically through an owner-scoped row-locking RPC', () => {
    for (const sql of [migration, schema]) {
      expect(sql).toMatch(
        /create or replace function (?:public\.)?law_tech_update_knowledge_entry\s*\(\s*p_owner_id uuid,\s*p_item_id uuid,\s*p_patch jsonb\s*\)/i
      )
      expect(sql).toMatch(
        /from (?:public\.)?content_items item[\s\S]+item\.id = p_item_id[\s\S]+item\.owner_id = p_owner_id[\s\S]+item\.type = 'knowledge'[\s\S]+for update/i
      )
      expect(sql).toMatch(
        /if not found then[\s\S]+knowledge entry not found[\s\S]+errcode = 'P0002'/i
      )
      for (const key of [
        'title',
        'summary',
        'body_markdown',
        'kind',
        'state',
        'domain',
        'topic',
        'seed_text',
        'tags',
        'review_status',
        'provenance',
        'show_on_home'
      ]) {
        expect(sql).toContain(`p_patch ? '${key}'`)
      }
      expect(sql).toMatch(
        /body_markdown[\s\S]+btrim[\s\S]+raise exception 'knowledge body is required'/i
      )
      expect(sql).toMatch(
        /select coalesce\(max\(version\),\s*0\) \+ 1[\s\S]+insert into (?:public\.)?content_versions/i
      )
      expect(sql).toMatch(
        /insert into (?:public\.)?content_access[\s\S]+on conflict \(item_id\)[\s\S]+mode = 'private'[\s\S]+allow_indexing = false[\s\S]+allow_rss = false[\s\S]+allow_sitemap = false/i
      )
      expect(sql).toMatch(
        /update (?:public\.)?content_display[\s\S]+p_patch \? 'tags'[\s\S]+p_patch \? 'domain'/i
      )
      expect(sql).toMatch(
        /from jsonb_array_elements\(p_patch->'tags'\) as tag\(value\)[\s\S]+jsonb_typeof\(value\) is distinct from 'string'/i
      )
      expect(sql).toMatch(
        /search_text[\s\S]+v_title[\s\S]+v_summary[\s\S]+v_body_markdown[\s\S]+v_domain[\s\S]+v_topic[\s\S]+v_tags[\s\S]+v_seed_text/i
      )
    }
  })

  it('makes fresh-schema knowledge tables fail closed without undefined auth helpers', () => {
    for (const table of ['knowledge_entries', 'knowledge_links', 'knowledge_assets']) {
      expect(schema).toMatch(
        new RegExp(`alter table ${table} enable row level security`, 'i')
      )
    }
    expect(schema).not.toMatch(/law_tech_current_profile_id\(\)|law_tech_is_owner\(\)/i)
  })
})
