import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { mergeContentIndexes } from '@/lib/contentHierarchy'
import { normalizeNotionContentIndex } from '@/lib/content/notionIndex'
import {
  listPublishedContentMetadata,
  toSnapshotLikeContent
} from '@/lib/contentRepository'
import { getPublicLiveContentIndex } from '@/lib/contentSnapshots'
import { sortPublicContent } from '@/lib/content/publicContent'

const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_KEY = '__lawTechPublicContentIndexCache'

function cacheStore() {
  if (!globalThis[CACHE_KEY]) {
    globalThis[CACHE_KEY] = {
      expiresAt: 0,
      value: null,
      promise: null
    }
  }
  return globalThis[CACHE_KEY]
}

async function assemblePublicContentIndex(from, options = {}) {
  let items = getPublicLiveContentIndex()
  const sources = new Set(items.length ? ['live-json'] : [])

  try {
    const notionData = await fetchGlobalAllData({ from })
    const notionItems = normalizeNotionContentIndex(notionData?.allPages || [])
    items = mergeContentIndexes(notionItems, items)
    if (notionItems.length) sources.add('notion')
  } catch (error) {
    console.warn('[public-content] Notion index read failed; keeping other sources', error)
  }

  try {
    const rows = await listPublishedContentMetadata({ includeBody: Boolean(options.includeBody) })
    const databaseItems = rows
      .map(row => toSnapshotLikeContent(row, { includeBody: Boolean(options.includeBody) }))
      .filter(item => item.access?.mode !== 'private')

    items = mergeContentIndexes(items, databaseItems)
    if (databaseItems.length) sources.add('database')
  } catch (error) {
    console.warn('[public-content] database read failed; keeping other sources', error)
  }

  return {
    items: sortPublicContent(items),
    source: [...sources].join('+') || 'empty'
  }
}

export async function loadPublicContentIndex(options = {}) {
  const from = options.from || 'public-content-index'
  const ttlMs = Number(options.ttlMs || CACHE_TTL_MS)
  const bypassCache = Boolean(options.bypassCache)
  const now = Date.now()
  const cache = cacheStore()

  if (!bypassCache && cache.value && cache.expiresAt > now) {
    return cache.value
  }

  if (!bypassCache && cache.promise) return cache.promise

  if (options.includeBody) return assemblePublicContentIndex(from, { includeBody: true })

  const promise = assemblePublicContentIndex(from, options)
    .then(value => {
      cache.value = value
      cache.expiresAt = Date.now() + ttlMs
      cache.promise = null
      return value
    })
    .catch(error => {
      cache.promise = null
      throw error
    })

  cache.promise = promise
  return promise
}

export function clearPublicContentIndexCache() {
  const cache = cacheStore()
  cache.expiresAt = 0
  cache.value = null
  cache.promise = null
}
