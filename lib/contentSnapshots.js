import fs from 'fs'
import path from 'path'

const SNAPSHOT_ROOT = path.join(process.cwd(), 'data/content-snapshots/live')
const INDEX_FILE = path.join(SNAPSHOT_ROOT, 'index.json')

function safeFileName(slug) {
  return `${slug.replace(/[/_]/g, '--')}.json`
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    console.warn(`[contentSnapshots] failed to read ${filePath}`, error)
    return fallback
  }
}

function compareByDate(left, right) {
  const leftDate = Date.parse(left?.date || left?.updatedAt || 0)
  const rightDate = Date.parse(right?.date || right?.updatedAt || 0)
  return rightDate - leftDate
}

export function getLiveContentIndex() {
  const snapshots = readJsonFile(INDEX_FILE, [])

  return snapshots
    .filter(item => item?.status === 'published')
    .sort(compareByDate)
}

export function getPublicLiveContentIndex() {
  return getLiveContentIndex().filter(item => item.access?.mode !== 'private')
}

export function getLiveContentPaths() {
  return getPublicLiveContentIndex().map(item => ({
    params: {
      slug: item.slug.split('/')
    }
  }))
}

export function getLiveContentBySlug(slug) {
  const normalizedSlug = Array.isArray(slug) ? slug.join('/') : slug
  if (!normalizedSlug) return null

  const snapshot = readJsonFile(
    path.join(SNAPSHOT_ROOT, safeFileName(normalizedSlug)),
    null
  )

  if (!snapshot || snapshot.status !== 'published') return null
  if (snapshot.access?.mode === 'private') return null

  return snapshot
}

export function isContentExpired(snapshot, now = new Date()) {
  const expiresAt = snapshot?.access?.expiresAt
  if (!expiresAt) return false
  return Date.parse(expiresAt) <= now.getTime()
}

export function toPublicContentProps(snapshot, options = {}) {
  if (!snapshot) return null

  const locked = snapshot.access?.mode === 'password'
  const expired = locked && isContentExpired(snapshot)
  const includeBody = options.includeBody && !locked && !expired
  const { bodyMarkdown, access, ...metadata } = snapshot

  return {
    ...metadata,
    access: {
      mode: access?.mode || 'public',
      expiresAt: access?.expiresAt || null,
      allowIndexing: Boolean(access?.allowIndexing),
      allowRss: Boolean(access?.allowRss),
      allowSitemap: Boolean(access?.allowSitemap)
    },
    bodyMarkdown: includeBody ? bodyMarkdown : '',
    locked,
    expired
  }
}

export function getContentFacets(snapshots = []) {
  const categories = new Set()
  const tags = new Set()
  const courses = new Set()
  const folderTree = new Map()

  snapshots.forEach(item => {
    const category = item?.display?.category || item?.category
    if (category) categories.add(category)

    ;(item?.display?.tags || item?.tags || []).forEach(tag => {
      if (tag) tags.add(tag)
    })

    if (item?.course?.name) courses.add(item.course.name)

    const pathSegments = item?.folder?.path || ['未归档']
    let cursor = folderTree
    pathSegments.forEach(segment => {
      if (!cursor.has(segment)) cursor.set(segment, new Map())
      cursor = cursor.get(segment)
    })
  })

  return {
    categories: Array.from(categories),
    tags: Array.from(tags),
    courses: Array.from(courses),
    folders: mapToTree(folderTree)
  }
}

function mapToTree(map) {
  return Array.from(map.entries()).map(([name, children]) => ({
    name,
    children: mapToTree(children)
  }))
}

export function getContentStats(snapshots = []) {
  return snapshots.reduce(
    (stats, item) => {
      stats.total += 1
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1
      stats.byAccess[item.access?.mode || 'public'] =
        (stats.byAccess[item.access?.mode || 'public'] || 0) + 1
      return stats
    },
    { total: 0, byType: {}, byAccess: {} }
  )
}
