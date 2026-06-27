import crypto from 'crypto'

import { getSupabaseRestConfig } from '@/lib/db/client'
import { hashPassword } from '@/lib/passwordHash'
import {
  buildCoursePublicationModel,
  COURSE_CONTENT_SOURCE,
  LEGACY_COURSE_CONTENT_SOURCE
} from '@/lib/contentPublishingModel'

async function request(pathname, options = {}) {
  const { baseUrl, headers } = getSupabaseRestConfig()
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Content database request failed ${response.status}: ${detail}`)
  }

  const body = await response.text()
  return body ? JSON.parse(body) : null
}

function checksum(markdown = '') {
  return crypto.createHash('sha256').update(String(markdown || '')).digest('hex')
}

async function rowsForItem(itemId) {
  const [versions, accessRows, displayRows] = await Promise.all([
    request(`/content_versions?select=*&item_id=eq.${encodeURIComponent(itemId)}&order=version.desc`),
    request(`/content_access?select=*&item_id=eq.${encodeURIComponent(itemId)}&limit=1`),
    request(`/content_display?select=*&item_id=eq.${encodeURIComponent(itemId)}&limit=1`)
  ])
  return {
    versions: versions || [],
    access: accessRows?.[0] || null,
    display: displayRows?.[0] || null
  }
}

function mapManaged(item, related = {}) {
  const latest = related.versions?.[0] || null
  const folder = related.display?.folder_path || []
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    type: item.type,
    status: item.status,
    source: item.source,
    sourceId: item.source_id,
    summary: item.summary || '',
    updatedAt: item.updated_at,
    version: latest?.version || 0,
    checksum: latest?.checksum || '',
    bodyMarkdown: latest?.body_markdown || '',
    settings: {
      title: item.title,
      summary: item.summary || '',
      slug: item.slug,
      category: related.display?.category || '',
      collection: folder[1] || related.display?.course_name || '',
      folderPath: folder,
      tags: related.display?.tags || [],
      accessMode: related.access?.mode || 'private',
      expiresAt: related.access?.expires_at || null,
      allowIndexing: Boolean(related.access?.allow_indexing),
      allowRss: Boolean(related.access?.allow_rss),
      allowSitemap: Boolean(related.access?.allow_sitemap),
      showInRecent: related.display?.show_in_recent !== false,
      pinned: Boolean(related.display?.pinned)
    },
    course: {
      name: related.display?.course_name || '',
      lesson: related.display?.course_lesson || '',
      teacher: related.display?.course_teacher || '',
      date: related.display?.course_date || null
    }
  }
}

export async function getManagedContentBySource(sourceId) {
  const sourceFilter = [COURSE_CONTENT_SOURCE, LEGACY_COURSE_CONTENT_SOURCE].join(',')
  const rows = await request(
    `/content_items?select=*&source=in.(${sourceFilter})&source_id=eq.${encodeURIComponent(sourceId)}&order=updated_at.desc&limit=1`
  )
  const item = rows?.[0]
  if (!item) return null
  return mapManaged(item, await rowsForItem(item.id))
}

export async function listManagedContent(limit = 100) {
  const items = await request(
    `/content_items?select=*&order=updated_at.desc&limit=${Math.min(Number(limit) || 100, 200)}`
  )
  const result = []
  for (const item of items || []) {
    result.push(mapManaged(item, await rowsForItem(item.id)))
  }
  return result
}

async function ensureSlugAvailable(slug, existingId = '') {
  const rows = await request(
    `/content_items?select=id,source,source_id&slug=eq.${encodeURIComponent(slug)}&limit=1`
  )
  const conflict = rows?.[0]
  if (conflict && conflict.id !== existingId) {
    throw new Error('这个链接路径已被其他内容使用，请换一个 slug')
  }
}

async function writeItem(existing, model, status) {
  const payload = {
    slug: model.slug,
    title: model.title,
    type: model.type,
    status,
    source: model.source,
    source_id: model.sourceId,
    summary: model.summary || null,
    updated_at: new Date().toISOString()
  }

  await ensureSlugAvailable(model.slug, existing?.id || '')

  if (existing?.id) {
    const rows = await request(`/content_items?id=eq.${encodeURIComponent(existing.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    })
    return rows?.[0]
  }

  const rows = await request('/content_items', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  })
  return rows?.[0]
}

async function writeVersion(itemId, markdown, publish) {
  const versions = await request(
    `/content_versions?select=*&item_id=eq.${encodeURIComponent(itemId)}&order=version.desc`
  )
  const current = versions?.[0] || null
  const nextChecksum = checksum(markdown)
  let latest = current

  if (!current || current.checksum !== nextChecksum) {
    const inserted = await request('/content_versions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        item_id: itemId,
        version: Number(current?.version || 0) + 1,
        body_markdown: markdown,
        checksum: nextChecksum,
        is_published: false
      })
    })
    latest = inserted?.[0]
  }

  await request(`/content_versions?item_id=eq.${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_published: false })
  })

  if (publish && latest?.version) {
    await request(
      `/content_versions?item_id=eq.${encodeURIComponent(itemId)}&version=eq.${latest.version}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ is_published: true })
      }
    )
  }

  return latest
}

async function writeAccess(itemId, model, existing) {
  const settings = model.settings
  let passwordHash = existing?.access?.password_hash || null
  if (settings.accessMode === 'password' && settings.password) {
    passwordHash = hashPassword(settings.password)
  }
  if (settings.accessMode !== 'password') passwordHash = null
  if (settings.accessMode === 'password' && !passwordHash) {
    throw new Error('密码访问需要设置密码')
  }

  await request('/content_access?on_conflict=item_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      item_id: itemId,
      mode: settings.accessMode,
      password_hash: passwordHash,
      expires_at: settings.expiresAt || null,
      allow_indexing: settings.allowIndexing,
      allow_rss: settings.allowRss,
      allow_sitemap: settings.allowSitemap
    })
  })
}

async function writeDisplay(itemId, model) {
  const settings = model.settings
  await request('/content_display?on_conflict=item_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      item_id: itemId,
      category: settings.category,
      tags: settings.tags,
      folder_path: settings.folderPath,
      course_name: model.course.name,
      course_lesson: model.course.lesson,
      course_teacher: model.course.teacher || null,
      course_date: model.course.date || null,
      pinned: settings.pinned,
      show_in_recent: settings.showInRecent
    })
  })
}

export async function saveCoursePublication({
  jobId,
  workflow,
  lessonKey,
  settings,
  publish = false
}) {
  const lesson = workflow.lessons?.find(item => item.key === lessonKey)
  if (!lesson) throw new Error('找不到课次')
  if (lesson.noteDeletion?.deletedAt) throw new Error('回收站中的笔记不能发布')
  if (!lesson.finalNote?.markdown) throw new Error('课次尚未形成最终笔记')

  const sourceId = `${jobId}:${lessonKey}`
  const existing = await getManagedContentBySource(sourceId)
  const rawExisting = existing
    ? {
        id: existing.id,
        access: {
          password_hash: (await rowsForItem(existing.id)).access?.password_hash || null
        }
      }
    : null
  const model = buildCoursePublicationModel({
    jobId,
    workflow,
    lesson,
    settings,
    existing
  })
  const status = publish ? 'published' : 'draft'
  const item = await writeItem(existing, model, status)
  const version = await writeVersion(item.id, model.bodyMarkdown, publish)
  await writeAccess(item.id, model, rawExisting)
  await writeDisplay(item.id, model)
  const managed = mapManaged(item, await rowsForItem(item.id))
  return {
    ...managed,
    status,
    version: version?.version || managed.version,
    checksum: version?.checksum || managed.checksum
  }
}

export async function withdrawManagedContent(itemId) {
  const rows = await request(`/content_items?id=eq.${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      status: 'draft',
      updated_at: new Date().toISOString()
    })
  })
  if (!rows?.[0]) throw new Error('找不到待撤回的内容')

  await request(`/content_versions?item_id=eq.${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_published: false })
  })
  return mapManaged(rows[0], await rowsForItem(itemId))
}
