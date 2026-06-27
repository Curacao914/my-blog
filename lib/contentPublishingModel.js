export const COURSE_CONTENT_SOURCE = 'course-worker'
export const LEGACY_COURSE_CONTENT_SOURCE = 'course-workflow'

export function isCourseContentSource(value = '') {
  return [COURSE_CONTENT_SOURCE, LEGACY_COURSE_CONTENT_SOURCE].includes(String(value || ''))
}

function text(value = '') {
  return String(value || '').trim()
}

function hashShort(value = '') {
  let hash = 2166136261
  for (const char of String(value || '')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).slice(0, 8)
}

export function slugSegment(value, fallback = 'item') {
  const normalized = text(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || `${fallback}-${hashShort(value)}`
}

export function normalizeContentSlug(value, fallback = 'content/item') {
  const segments = String(value || '')
    .split('/')
    .map(segment => slugSegment(segment, 'item'))
    .filter(Boolean)
  return segments.length ? segments.join('/') : fallback
}

function markdownTitle(markdown, fallback) {
  const match = String(markdown || '').match(/^#\s+(.+)$/m)
  return text(match?.[1]) || fallback
}

function readableSummary(markdown, fallback) {
  const cleaned = String(markdown || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.slice(0, 150) || fallback
}

export function buildCoursePublicationModel({
  jobId,
  workflow = {},
  lesson = {},
  settings = {},
  existing = null
} = {}) {
  const markdown = lesson.finalNote?.markdown || ''
  if (!markdown) throw new Error('课程最终笔记不存在')

  const courseName = text(workflow.courseSpec?.courseName) || '未命名课程'
  const teacher = text(workflow.courseSpec?.teacher)
  const order = Number(lesson.order || 1)
  const category = text(settings.category) || existing?.settings?.category || '遇事不决'
  const collection = text(settings.collection) || existing?.settings?.collection || courseName
  const defaultSlug = `notes/${slugSegment(courseName, 'course')}/lesson-${order}`
  const slug = normalizeContentSlug(settings.slug || existing?.settings?.slug || defaultSlug, defaultSlug)
  const accessMode = ['public', 'password', 'private'].includes(settings.accessMode)
    ? settings.accessMode
    : (existing?.settings?.accessMode || 'private')
  const tags = Array.isArray(settings.tags)
    ? settings.tags
    : String(settings.tags || '')
      .split(/[，,]/)
      .map(item => item.trim())
      .filter(Boolean)
  const normalizedTags = [...new Set(['课程笔记', courseName, ...tags].filter(Boolean))]
  const cover = Object.prototype.hasOwnProperty.call(settings, 'cover')
    ? text(settings.cover)
    : (existing?.settings?.cover || '')

  return {
    source: COURSE_CONTENT_SOURCE,
    sourceId: `${jobId}:${lesson.key}`,
    title: text(settings.title) || existing?.settings?.title || markdownTitle(markdown, lesson.title || `${courseName} 第${order}课`),
    summary: text(settings.summary) || existing?.settings?.summary || readableSummary(markdown, lesson.title || `${courseName} 第${order}课课程笔记`),
    slug,
    type: 'course-note',
    bodyMarkdown: markdown,
    settings: {
      title: text(settings.title) || existing?.settings?.title || markdownTitle(markdown, lesson.title || `${courseName} 第${order}课`),
      summary: text(settings.summary) || existing?.settings?.summary || readableSummary(markdown, lesson.title || `${courseName} 第${order}课课程笔记`),
      slug,
      cover,
      category,
      collection,
      tags: normalizedTags,
      folderPath: [category, collection].filter(Boolean),
      accessMode,
      password: text(settings.password),
      expiresAt: text(settings.expiresAt) || null,
      allowIndexing: accessMode === 'public' && settings.allowIndexing !== false,
      allowRss: accessMode === 'public' && settings.allowRss !== false,
      allowSitemap: accessMode === 'public' && settings.allowSitemap !== false,
      showInRecent: settings.showInRecent !== false,
      pinned: Boolean(settings.pinned)
    },
    course: {
      name: courseName,
      lesson: lesson.title || `第${order}课`,
      teacher,
      date: lesson.date || null
    }
  }
}
