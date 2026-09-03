#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const SNAPSHOT_ROOT = path.join(process.cwd(), 'data/content-snapshots/live')
const INDEX_FILE = path.join(SNAPSHOT_ROOT, 'index.json')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\n/)
      .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map(line => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

function safeFileName(slug) {
  return `${slug.replace(/[/_]/g, '--')}.json`
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function getConfig() {
  const localEnv = parseEnvFile(path.join(process.cwd(), '.env.local'))
  const supabaseUrl = process.env.SUPABASE_URL || localEnv.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    localEnv.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.'
    )
  }

  return {
    baseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    }
  }
}

async function request(pathname, options = {}) {
  const config = getConfig()
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...config.headers,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed ${response.status}: ${text}`)
  }

  const text = await response.text()
  if (!text) return null
  return JSON.parse(text)
}

function toContentItem(snapshot) {
  return {
    slug: snapshot.slug,
    title: snapshot.title,
    type: snapshot.type,
    status: snapshot.status,
    source: snapshot.source || 'manual',
    source_id: snapshot.sourceId || null,
    summary: snapshot.summary || null,
    updated_at: snapshot.updatedAt || new Date().toISOString()
  }
}

function toContentAccess(snapshot, itemId) {
  const access = snapshot.access || {}

  return {
    item_id: itemId,
    mode: access.mode || 'private',
    password_hash: access.passwordHash || null,
    expires_at: access.expiresAt || null,
    allow_indexing: Boolean(access.allowIndexing),
    allow_rss: Boolean(access.allowRss),
    allow_sitemap: Boolean(access.allowSitemap)
  }
}

function toContentDisplay(snapshot, itemId) {
  const display = snapshot.display || {}
  const course = snapshot.course || {}
  const folder = snapshot.folder || {}

  return {
    item_id: itemId,
    category: display.category || snapshot.category || null,
    tags: display.tags || snapshot.tags || [],
    folder_path: folder.path || [],
    course_name: course.name || null,
    course_lesson: course.lesson || null,
    course_teacher: course.teacher || null,
    course_date: course.date || null,
    pinned: Boolean(display.pinned),
    show_in_recent: display.showInRecent !== false
  }
}

async function upsertContent(snapshot) {
  const [item] = await request('/content_items?on_conflict=slug', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(toContentItem(snapshot))
  })

  await request('/content_versions?on_conflict=item_id,version', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      item_id: item.id,
      version: 1,
      body_markdown: snapshot.bodyMarkdown,
      checksum: snapshot.checksum,
      is_published: snapshot.status === 'published'
    })
  })

  await request('/content_access?on_conflict=item_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(toContentAccess(snapshot, item.id))
  })

  await request('/content_display?on_conflict=item_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(toContentDisplay(snapshot, item.id))
  })

  return item
}

function loadLiveSnapshots() {
  const index = readJson(INDEX_FILE, [])

  return index.map(item => {
    const snapshotPath = path.join(SNAPSHOT_ROOT, safeFileName(item.slug))
    return readJson(snapshotPath, item)
  })
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const snapshots = loadLiveSnapshots()

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          count: snapshots.length,
          slugs: snapshots.map(snapshot => snapshot.slug)
        },
        null,
        2
      )
    )
    return
  }

  const imported = []
  for (const snapshot of snapshots) {
    const item = await upsertContent(snapshot)
    imported.push({ slug: snapshot.slug, id: item.id })
  }

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        imported
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
