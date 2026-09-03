import { searchAlgoliaContent } from '@/lib/content/algoliaSearch'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import {
  publicContentCategory,
  publicContentCollection,
  publicContentDate,
  publicContentHref,
  publicContentTags
} from '@/lib/content/publicContent'

const FALLBACK_TTL_MS = 5 * 60 * 1000
let fallbackCache = { expiresAt: 0, items: null, promise: null }

function clean(value, limit = 160) {
  return String(value || '').trim().slice(0, limit)
}

function bodyText(item = {}) {
  return [
    item.title,
    item.summary,
    item.bodyMarkdown,
    item.content,
    publicContentCategory(item),
    publicContentCollection(item),
    ...publicContentTags(item)
  ].filter(Boolean).join(' ').toLocaleLowerCase('zh-CN')
}

function toHit(item = {}) {
  return {
    id: item.id || `${item.source || 'content'}:${item.slug || item.title || 'item'}`,
    title: item.title || '未命名内容',
    summary: item.summary || '',
    href: publicContentHref(item),
    cover: item.cover || '',
    category: publicContentCategory(item),
    collection: publicContentCollection(item),
    tags: publicContentTags(item),
    type: item.type || 'article',
    source: item.source || 'local',
    date: publicContentDate(item)
  }
}

async function fallbackItems() {
  const now = Date.now()
  if (fallbackCache.items && fallbackCache.expiresAt > now) return fallbackCache.items
  if (fallbackCache.promise) return fallbackCache.promise
  fallbackCache.promise = loadPublicContentIndex({
    from: 'public-search-body-fallback',
    includeBody: true
  }).then(result => {
    const items = Array.isArray(result?.items) ? result.items.filter(Boolean) : []
    fallbackCache = { items, expiresAt: Date.now() + FALLBACK_TTL_MS, promise: null }
    return items
  }).catch(error => {
    fallbackCache.promise = null
    throw error
  })
  return fallbackCache.promise
}

async function searchLocalBody({ query, category = '', type = '', hitsPerPage = 24 }) {
  const keyword = String(query || '').trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return []
  const items = await fallbackItems()
  return items
    .filter(item => !category || category === '全部' || publicContentCategory(item) === category)
    .filter(item => !type || type === '全部' || item.type === type)
    .map(item => {
      const title = String(item.title || '').toLocaleLowerCase('zh-CN')
      const summary = String(item.summary || '').toLocaleLowerCase('zh-CN')
      const haystack = bodyText(item)
      if (!haystack.includes(keyword)) return null
      const score = (title.includes(keyword) ? 8 : 0) + (summary.includes(keyword) ? 3 : 0) + (Date.parse(publicContentDate(item) || '') || 0) / 1e15
      return { item, score }
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(50, Math.max(1, Number(hitsPerPage) || 24)))
    .map(entry => toHit(entry.item))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const query = clean(req.query.q || req.query.query)
  if (!query) return res.status(200).json({ ok: true, available: false, hits: [], total: 0 })

  const category = clean(req.query.category, 80)
  const type = clean(req.query.type, 40)
  const page = Number(req.query.page || 0)
  const hitsPerPage = Number(req.query.hitsPerPage || 24)

  try {
    const result = await searchAlgoliaContent({ query, category, type, page, hitsPerPage })
    if (result.available) {
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
      return res.status(200).json({ ok: true, mode: 'algolia', ...result })
    }
  } catch (error) {
    console.warn('[public-search] Algolia unavailable; using local body index', error)
  }

  try {
    const hits = await searchLocalBody({ query, category, type, hitsPerPage })
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    return res.status(200).json({
      ok: true,
      available: true,
      mode: 'local-body',
      hits,
      total: hits.length,
      page: 0,
      pages: 1,
      processingTimeMS: 0
    })
  } catch (error) {
    console.warn('[public-search] local body search failed', error)
    return res.status(200).json({ ok: true, available: false, mode: 'metadata', hits: [], total: 0 })
  }
}
