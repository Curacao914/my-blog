import { getSupabaseRestConfig } from '@/lib/db/client'

async function supabaseGet(pathname) {
  const { baseUrl, headers } = getSupabaseRestConfig()
  const response = await fetch(`${baseUrl}${pathname}`, { headers })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase read failed ${response.status}: ${text}`)
  }

  return response.json()
}

function byItemId(rows = []) {
  return new Map(rows.map(row => [row.item_id, row]))
}

function firstByItemId(rows = []) {
  const map = new Map()
  rows.forEach(row => {
    if (!map.has(row.item_id)) map.set(row.item_id, row)
  })
  return map
}

export async function listPublishedContentMetadata() {
  const [items, versions, accessRows, displayRows] = await Promise.all([
    supabaseGet(
      '/content_items?select=id,slug,title,type,status,source,source_id,summary,updated_at&status=eq.published&order=updated_at.desc'
    ),
    supabaseGet(
      '/content_versions?select=item_id,version,checksum,is_published,created_at&is_published=eq.true'
    ),
    supabaseGet('/content_access?select=*'),
    supabaseGet('/content_display?select=*')
  ])

  const versionByItemId = byItemId(versions)
  const accessByItemId = byItemId(accessRows)
  const displayByItemId = byItemId(displayRows)

  return items.map(item => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    type: item.type,
    status: item.status,
    source: item.source,
    sourceId: item.source_id,
    summary: item.summary,
    updatedAt: item.updated_at,
    version: versionByItemId.get(item.id) || null,
    access: accessByItemId.get(item.id) || null,
    display: displayByItemId.get(item.id) || null
  }))
}

export async function listAdminContentMetadata() {
  const [items, versions, accessRows, displayRows] = await Promise.all([
    supabaseGet(
      '/content_items?select=id,slug,title,type,status,source,source_id,summary,updated_at&order=updated_at.desc'
    ),
    supabaseGet(
      '/content_versions?select=item_id,version,checksum,is_published,created_at&order=created_at.desc'
    ),
    supabaseGet('/content_access?select=*'),
    supabaseGet('/content_display?select=*')
  ])

  const versionByItemId = firstByItemId(versions)
  const accessByItemId = byItemId(accessRows)
  const displayByItemId = byItemId(displayRows)

  return items.map(item => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    type: item.type,
    status: item.status,
    source: item.source,
    sourceId: item.source_id,
    summary: item.summary,
    updatedAt: item.updated_at,
    version: versionByItemId.get(item.id) || null,
    access: accessByItemId.get(item.id) || null,
    display: displayByItemId.get(item.id) || null
  }))
}

export async function getPublishedContentBySlug(slug) {
  const encodedSlug = encodeURIComponent(slug)
  const items = await supabaseGet(
    `/content_items?select=id,slug,title,type,status,source,source_id,summary,updated_at&slug=eq.${encodedSlug}&status=eq.published&limit=1`
  )

  const item = items[0]
  if (!item) return null

  const [versions, accessRows, displayRows, assets] = await Promise.all([
    supabaseGet(
      `/content_versions?select=version,body_markdown,checksum,is_published,created_at&item_id=eq.${item.id}&is_published=eq.true&limit=1`
    ),
    supabaseGet(`/content_access?select=*&item_id=eq.${item.id}&limit=1`),
    supabaseGet(`/content_display?select=*&item_id=eq.${item.id}&limit=1`),
    supabaseGet(`/content_assets?select=url,alt,checksum&item_id=eq.${item.id}`)
  ])

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    type: item.type,
    status: item.status,
    source: item.source,
    sourceId: item.source_id,
    summary: item.summary,
    updatedAt: item.updated_at,
    version: versions[0] || null,
    access: accessRows[0] || null,
    display: displayRows[0] || null,
    assets
  }
}

function mapAccess(access) {
  return {
    mode: access?.mode || 'public',
    expiresAt: access?.expires_at || null,
    allowIndexing: Boolean(access?.allow_indexing),
    allowRss: Boolean(access?.allow_rss),
    allowSitemap: Boolean(access?.allow_sitemap)
  }
}

function mapDisplay(display) {
  return {
    category: display?.category || '',
    tags: display?.tags || [],
    pinned: Boolean(display?.pinned),
    showInRecent: display?.show_in_recent !== false
  }
}

function mapCourse(display) {
  if (
    !display?.course_name &&
    !display?.course_lesson &&
    !display?.course_teacher &&
    !display?.course_date
  ) {
    return null
  }

  return {
    name: display.course_name || '',
    lesson: display.course_lesson || '',
    teacher: display.course_teacher || '',
    date: display.course_date || ''
  }
}

function mapFolder(display) {
  return {
    path: display?.folder_path?.length ? display.folder_path : ['未归档']
  }
}

export function toSnapshotLikeContent(row, options = {}) {
  const access = mapAccess(row.access)
  const display = mapDisplay(row.display)
  const locked = access.mode === 'password'
  const privateOnly = access.mode === 'private'
  const expired =
    locked && access.expiresAt
      ? Date.parse(access.expiresAt) <= Date.now()
      : false
  const course = mapCourse(row.display)

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    status: row.status,
    summary: row.summary,
    source: row.source,
    sourceId: row.sourceId,
    updatedAt: row.updatedAt,
    date: row.updatedAt,
    tags: display.tags,
    category: display.category,
    access,
    display,
    course,
    folder: mapFolder(row.display),
    assets: row.assets || [],
    checksum: row.version?.checksum || '',
    bodyMarkdown:
      options.includeBody && !locked && !privateOnly && !expired
        ? row.version?.body_markdown || ''
        : '',
    locked,
    privateOnly,
    expired
  }
}
