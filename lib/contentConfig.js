import { getSupabaseRestConfig } from '@/lib/db/client'
import { hashPassword } from '@/lib/passwordHash'

const allowedAccessModes = new Set(['public', 'password', 'private'])
const allowedCategories = new Set(['法律之上', '法与算法', '遇事不决', '秘密花园'])
const allowedStatuses = new Set(['draft', 'published', 'archived'])

async function supabaseRequest(pathname, options = {}) {
  const { baseUrl, headers } = getSupabaseRestConfig()
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed ${response.status}: ${text}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function assertPlainStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`)
  }

  value.forEach(item => {
    if (typeof item !== 'string') {
      throw new Error(`${fieldName} must contain strings only`)
    }
  })
}

function normalizeFolderPath(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split('/')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeOptionalString(value) {
  return String(value || '').trim()
}

export function validateContentConfigPatch(patch) {
  if (!patch || typeof patch !== 'object') {
    throw new Error('Invalid config patch')
  }

  if ('bodyMarkdown' in patch || 'body_markdown' in patch) {
    throw new Error('Body markdown cannot be updated from content config')
  }

  const slug = String(patch.slug || '').trim()
  if (!slug) throw new Error('slug is required')

  const status = String(patch.status || '').trim()
  if (status && !allowedStatuses.has(status)) {
    throw new Error('Invalid status')
  }

  const category = String(patch.display?.category || '').trim()
  if (category && !allowedCategories.has(category)) {
    throw new Error('Invalid category')
  }

  const tags = patch.display?.tags || []
  assertPlainStringArray(tags, 'display.tags')

  const folderPath = normalizeFolderPath(patch.display?.folderPath)
  const courseDate = normalizeOptionalString(patch.display?.courseDate)
  if (courseDate && Number.isNaN(Date.parse(courseDate))) {
    throw new Error('Invalid courseDate')
  }

  const mode = String(patch.access?.mode || 'private')
  if (!allowedAccessModes.has(mode)) {
    throw new Error('Invalid access mode')
  }

  const expiresAt = patch.access?.expiresAt || null
  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    throw new Error('Invalid expiresAt')
  }

  const password = patch.access?.password
  if (password !== undefined && typeof password !== 'string') {
    throw new Error('access.password must be a string')
  }

  return {
    slug,
    status,
    display: {
      category,
      tags: tags.map(tag => tag.trim()).filter(Boolean),
      folderPath,
      courseName: normalizeOptionalString(patch.display?.courseName),
      courseLesson: normalizeOptionalString(patch.display?.courseLesson),
      courseTeacher: normalizeOptionalString(patch.display?.courseTeacher),
      courseDate
    },
    access: {
      mode,
      expiresAt,
      password: password ? password.trim() : '',
      allowIndexing: mode === 'public' && Boolean(patch.access?.allowIndexing),
      allowRss: mode === 'public' && Boolean(patch.access?.allowRss),
      allowSitemap: mode === 'public' && Boolean(patch.access?.allowSitemap)
    }
  }
}

async function findContentItemBySlug(slug) {
  const encodedSlug = encodeURIComponent(slug)
  const rows = await supabaseRequest(
    `/content_items?select=id,slug&slug=eq.${encodedSlug}&limit=1`
  )

  return rows[0] || null
}

export async function updateContentConfig(patch) {
  const config = validateContentConfigPatch(patch)
  const item = await findContentItemBySlug(config.slug)

  if (!item) {
    throw new Error('Content item not found')
  }

  const accessPayload = {
    item_id: item.id,
    mode: config.access.mode,
    expires_at: config.access.expiresAt,
    allow_indexing: config.access.allowIndexing,
    allow_rss: config.access.allowRss,
    allow_sitemap: config.access.allowSitemap,
    updated_at: new Date().toISOString()
  }

  if (config.access.password) {
    accessPayload.password_hash = hashPassword(config.access.password)
  }

  await supabaseRequest('/content_access?on_conflict=item_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(accessPayload)
  })

  await supabaseRequest('/content_display?on_conflict=item_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      item_id: item.id,
      category: config.display.category || null,
      tags: config.display.tags,
      folder_path: config.display.folderPath,
      course_name: config.display.courseName || null,
      course_lesson: config.display.courseLesson || null,
      course_teacher: config.display.courseTeacher || null,
      course_date: config.display.courseDate || null,
      updated_at: new Date().toISOString()
    })
  })

  await supabaseRequest(`/content_items?id=eq.${item.id}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      ...(config.status ? { status: config.status } : {}),
      updated_at: new Date().toISOString()
    })
  })

  return {
    slug: config.slug,
    updated: true
  }
}
