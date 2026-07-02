import crypto from 'crypto'

import { profileCan } from '@/lib/auth/permissions'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { removeAlgoliaContent, upsertAlgoliaContent } from '@/lib/content/algoliaSearch'
import { revalidatePublicContentSurfaces } from '@/lib/content/revalidation'
import { normalizeContentSlug, slugSegment } from '@/lib/contentPublishingModel'
import { hashPassword } from '@/lib/passwordHash'
import { findNote, supabaseRest } from '@/lib/server/supabase'

const ALLOWED_TYPES = ['article', 'reading-note', 'project', 'page']

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function checksum(value = '') {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

function text(value = '') {
  return String(value || '').trim()
}

function tags(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[，,]/)
  return [...new Set(list.map(item => text(item)).filter(Boolean))].slice(0, 12)
}

function readableSummary(markdown = '') {
  return String(markdown || '')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

function noteOrigin(note = {}) {
  return String(
    note.note_type ||
    note.metadata?.originType ||
    note.metadata?.origin_type ||
    'quick_note'
  )
}

function isPublishableNote(note = {}) {
  return ['writing', 'reading', 'quick_note'].includes(noteOrigin(note))
}

function publicationDefaults(note = {}) {
  const origin = noteOrigin(note)
  if (origin === 'reading') {
    return { type: 'reading-note', collection: '阅读摘录', prefix: 'reading' }
  }
  if (origin === 'writing') {
    return { type: 'article', collection: '写作', prefix: 'writing' }
  }
  return { type: 'article', collection: '随手记', prefix: 'notes' }
}

async function relatedRows(itemId) {
  const [versions, accessRows, displayRows, assets] = await Promise.all([
    supabaseRest(`/content_versions?select=*&item_id=${eq(itemId)}&order=version.desc`),
    supabaseRest(`/content_access?select=*&item_id=${eq(itemId)}&limit=1`),
    supabaseRest(`/content_display?select=*&item_id=${eq(itemId)}&limit=1`),
    supabaseRest(`/content_assets?select=*&item_id=${eq(itemId)}&order=created_at.asc`)
  ])
  return {
    versions: versions || [],
    access: accessRows?.[0] || null,
    display: displayRows?.[0] || null,
    assets: assets || []
  }
}

async function existingRecord(ownerId, noteId) {
  const rows = await supabaseRest(
    `/content_items?select=*&owner_id=${eq(ownerId)}&source=eq.manual&source_id=${eq(noteId)}&order=updated_at.desc&limit=1`
  )
  const item = rows?.[0]
  if (!item) return null
  return { item, related: await relatedRows(item.id) }
}

function coverFromAssets(assets = []) {
  return assets.find(asset => asset.alt === 'cover')?.url || ''
}

function settingsFromRecord(note, record) {
  const item = record?.item
  const related = record?.related || {}
  const folder = related.display?.folder_path || []
  const defaults = publicationDefaults(note)
  const defaultSlug = `${defaults.prefix}/${slugSegment(note.title || 'draft', 'draft')}`
  return {
    title: item?.title || note.title || '未命名草稿',
    summary: item?.summary || readableSummary(note.body_markdown),
    type: ALLOWED_TYPES.includes(item?.type) ? item.type : defaults.type,
    slug: item?.slug || defaultSlug,
    cover: coverFromAssets(related.assets),
    category: related.display?.category || '遇事不决',
    collection: folder[1] || defaults.collection,
    tags: related.display?.tags || [],
    accessMode: related.access?.mode || 'private',
    password: '',
    expiresAt: related.access?.expires_at || '',
    allowIndexing: related.access?.allow_indexing !== false,
    allowRss: related.access?.allow_rss !== false,
    allowSitemap: related.access?.allow_sitemap !== false,
    showInRecent: related.display?.show_in_recent !== false,
    pinned: Boolean(related.display?.pinned)
  }
}

function normalizeSettings(note, input = {}, record = null) {
  const current = settingsFromRecord(note, record)
  const accessMode = ['public', 'password', 'private'].includes(input.accessMode) ? input.accessMode : current.accessMode
  const category = text(input.category) || current.category || '未归档'
  const collection = text(input.collection) || current.collection || '写作'
  const defaults = publicationDefaults(note)
  const fallbackSlug = `${defaults.prefix}/${slugSegment(input.title || note.title || 'draft', 'draft')}`
  return {
    title: text(input.title) || note.title || '未命名草稿',
    summary: text(input.summary) || readableSummary(note.body_markdown),
    type: ALLOWED_TYPES.includes(input.type) ? input.type : current.type,
    slug: normalizeContentSlug(input.slug || current.slug, fallbackSlug),
    cover: text(input.cover),
    category,
    collection,
    tags: tags(input.tags),
    accessMode,
    password: text(input.password),
    expiresAt: text(input.expiresAt) || null,
    allowIndexing: accessMode === 'public' && input.allowIndexing !== false,
    allowRss: accessMode === 'public' && input.allowRss !== false,
    allowSitemap: accessMode === 'public' && input.allowSitemap !== false,
    showInRecent: input.showInRecent !== false,
    pinned: Boolean(input.pinned)
  }
}

async function ensureSlug(slug, existingId = '') {
  const rows = await supabaseRest(`/content_items?select=id&slug=${eq(slug)}&limit=1`)
  if (rows?.[0] && rows[0].id !== existingId) throw new Error('这个链接路径已经被使用')
}

async function writeItem(ownerId, noteId, record, settings, status) {
  await ensureSlug(settings.slug, record?.item?.id || '')
  const payload = {
    owner_id: ownerId,
    slug: settings.slug,
    title: settings.title,
    type: settings.type,
    status,
    source: 'manual',
    source_id: noteId,
    summary: settings.summary || null,
    updated_at: new Date().toISOString()
  }
  if (record?.item?.id) {
    const rows = await supabaseRest(`/content_items?id=${eq(record.item.id)}&owner_id=${eq(ownerId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    })
    return rows?.[0]
  }
  const rows = await supabaseRest('/content_items', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  })
  return rows?.[0]
}

async function writeVersion(itemId, markdown, publish) {
  const versions = await supabaseRest(`/content_versions?select=*&item_id=${eq(itemId)}&order=version.desc`)
  const current = versions?.[0] || null
  const nextChecksum = checksum(markdown)
  let latest = current
  if (!current || current.checksum !== nextChecksum) {
    const rows = await supabaseRest('/content_versions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ item_id: itemId, version: Number(current?.version || 0) + 1, body_markdown: markdown, checksum: nextChecksum, is_published: false })
    })
    latest = rows?.[0]
  }
  await supabaseRest(`/content_versions?item_id=${eq(itemId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_published: false })
  })
  if (publish && latest?.version) {
    await supabaseRest(`/content_versions?item_id=${eq(itemId)}&version=eq.${latest.version}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ is_published: true })
    })
  }
  return latest
}

async function writeAccess(itemId, settings, previousHash = null) {
  let passwordHash = previousHash
  if (settings.accessMode === 'password' && settings.password) passwordHash = hashPassword(settings.password)
  if (settings.accessMode !== 'password') passwordHash = null
  if (settings.accessMode === 'password' && !passwordHash) throw new Error('密码访问需要设置密码')
  await supabaseRest('/content_access?on_conflict=item_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      item_id: itemId,
      mode: settings.accessMode,
      password_hash: passwordHash,
      expires_at: settings.expiresAt,
      allow_indexing: settings.allowIndexing,
      allow_rss: settings.allowRss,
      allow_sitemap: settings.allowSitemap,
      updated_at: new Date().toISOString()
    })
  })
}

async function writeDisplay(itemId, settings) {
  await supabaseRest('/content_display?on_conflict=item_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      item_id: itemId,
      category: settings.category,
      tags: settings.tags,
      folder_path: [settings.category, settings.collection].filter(Boolean),
      course_name: null,
      course_lesson: null,
      course_teacher: null,
      course_date: null,
      pinned: settings.pinned,
      show_in_recent: settings.showInRecent,
      updated_at: new Date().toISOString()
    })
  })
}

async function writeCover(itemId, cover) {
  const rows = await supabaseRest(`/content_assets?select=id,url&item_id=${eq(itemId)}&alt=eq.cover&limit=1`)
  const current = rows?.[0]
  if (current?.url === cover) return
  if (current?.id) await supabaseRest(`/content_assets?id=${eq(current.id)}`, { method: 'DELETE' })
  if (!cover) return
  await supabaseRest('/content_assets', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ item_id: itemId, url: cover, alt: 'cover' })
  })
}

function publicItem(item, settings, version) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    type: item.type,
    status: item.status,
    source: item.source,
    sourceId: item.source_id,
    summary: item.summary || '',
    bodyMarkdown: version?.body_markdown || '',
    version: version?.version || 1,
    checksum: version?.checksum || '',
    cover: settings.cover,
    settings: { ...settings, password: '' },
    access: { mode: settings.accessMode, allowIndexing: settings.allowIndexing },
    display: { category: settings.category, tags: settings.tags, pinned: settings.pinned, showInRecent: settings.showInRecent },
    category: settings.category,
    tags: settings.tags,
    folder: { path: [settings.category, settings.collection].filter(Boolean) }
  }
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  try {
    const noteId = String(req.method === 'GET' ? req.query.noteId || '' : req.body?.noteId || '')
    const note = await findNote(auth.profile.id, noteId)
    if (!note || !isPublishableNote(note)) {
      return res.status(404).json({ ok: false, error: '找不到这篇可发布草稿' })
    }
    const requiredPermission = noteOrigin(note) === 'writing' ? 'writing' : 'notes'
    if (!profileCan(auth.profile, requiredPermission)) {
      return res.status(403).json({ ok: false, error: '没有管理这篇草稿的权限' })
    }
    const record = await existingRecord(auth.profile.id, noteId)
    const canPublish = auth.profile.role === 'owner' || Boolean(auth.publicProfile?.permissions?.publish)

    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        settings: settingsFromRecord(note, record),
        publication: record ? publicItem(record.item, settingsFromRecord(note, record), record.related.versions?.[0]) : null,
        canPublish
      })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    const action = String(req.body?.action || 'draft')
    if (['publish', 'withdraw'].includes(action) && !canPublish) return res.status(403).json({ ok: false, error: '没有公开发布权限' })

    if (action === 'withdraw') {
      if (!record?.item?.id) throw new Error('这篇草稿还没有发布记录')
      const rows = await supabaseRest(`/content_items?id=${eq(record.item.id)}&owner_id=${eq(auth.profile.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'draft', updated_at: new Date().toISOString() })
      })
      await supabaseRest(`/content_versions?item_id=${eq(record.item.id)}`, { method: 'PATCH', body: JSON.stringify({ is_published: false }) })
      const settings = settingsFromRecord(note, record)
      const publication = publicItem(rows[0], settings, record.related.versions?.[0])
      await removeAlgoliaContent(publication).catch(error => console.warn('[writing publication] Algolia remove failed', error))
      await revalidatePublicContentSurfaces(res, publication.slug, 'writing publication')
      return res.status(200).json({ ok: true, publication })
    }

    const settings = normalizeSettings(note, req.body?.settings || {}, record)
    const publish = action === 'publish'
    const item = await writeItem(auth.profile.id, noteId, record, settings, publish ? 'published' : 'draft')
    const version = await writeVersion(item.id, note.body_markdown, publish)
    await Promise.all([
      writeAccess(item.id, settings, record?.related?.access?.password_hash || null),
      writeDisplay(item.id, settings),
      writeCover(item.id, settings.cover)
    ])
    const publication = publicItem(item, settings, { ...version, body_markdown: note.body_markdown })
    if (publish && settings.accessMode === 'public' && settings.allowIndexing) {
      await upsertAlgoliaContent(publication).catch(error => console.warn('[writing publication] Algolia update failed', error))
    } else {
      await removeAlgoliaContent(publication).catch(error => console.warn('[writing publication] Algolia remove failed', error))
    }
    await revalidatePublicContentSurfaces(res, publication.slug, 'writing publication')
    return res.status(200).json({ ok: true, publication })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Writing publication failed' })
  }
}
