import { normalizeNotionContentIndex } from '@/lib/content/notionIndex'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

const CACHE_KEY = '__lawTechNotionTaxonomyCache'
const TTL_MS = 10 * 60 * 1000

function cacheStore() {
  if (!globalThis[CACHE_KEY]) globalThis[CACHE_KEY] = { expiresAt: 0, items: [], promise: null }
  return globalThis[CACHE_KEY]
}

export async function getNotionTaxonomyItems({ bypassCache = false } = {}) {
  const cache = cacheStore()
  if (!bypassCache && cache.expiresAt > Date.now()) return cache.items
  if (!bypassCache && cache.promise) return cache.promise

  const promise = fetchGlobalAllData({ from: 'content-manage-taxonomy' })
    .then(data => {
      const items = normalizeNotionContentIndex(data?.allPages || [])
      cache.items = items
      cache.expiresAt = Date.now() + TTL_MS
      cache.promise = null
      return items
    })
    .catch(error => {
      cache.promise = null
      throw error
    })
  cache.promise = promise
  return promise
}

export function getCachedNotionTaxonomyItems() {
  return cacheStore().items
}

export function clearNotionTaxonomyCache() {
  const cache = cacheStore()
  cache.expiresAt = 0
  cache.items = []
  cache.promise = null
}
