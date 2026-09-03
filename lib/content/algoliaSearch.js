import BLOG from '@/blog.config'
import algoliasearch from 'algoliasearch'

import {
  publicContentCategory,
  publicContentCollection,
  publicContentDate,
  publicContentHref,
  publicContentTags,
  publicContentTypeLabel
} from '@/lib/content/publicContent'

const MAX_CONTENT_BYTES = 7800

function config() {
  return {
    appId: BLOG.ALGOLIA_APP_ID || '',
    adminKey: BLOG.ALGOLIA_ADMIN_APP_KEY || '',
    searchKey: BLOG.ALGOLIA_SEARCH_ONLY_APP_KEY || '',
    indexName: BLOG.ALGOLIA_INDEX || ''
  }
}

export function hasAlgoliaSearch() {
  const { appId, searchKey, indexName } = config()
  return Boolean(appId && searchKey && indexName)
}

export function hasAlgoliaAdmin() {
  const { appId, adminKey, indexName } = config()
  return Boolean(appId && adminKey && indexName)
}

function truncateUtf8(value = '', maxBytes = MAX_CONTENT_BYTES) {
  let bytes = 0
  let result = ''
  for (const char of String(value || '')) {
    const size = Buffer.byteLength(char, 'utf8')
    if (bytes + size > maxBytes) break
    result += char
    bytes += size
  }
  return result
}

function markdownText(value = '') {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, block => block.replace(/```[^\n]*\n?|```/g, ' '))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function recordId(item = {}) {
  if (item.source === 'notion' && item.sourceId) return String(item.sourceId)
  return String(item.id || `${item.source || 'content'}:${item.slug || item.title || 'item'}`)
}

export function toAlgoliaRecord(item = {}) {
  const body = markdownText(item.bodyMarkdown || item.content || '')
  const record = {
    objectID: recordId(item),
    title: item.title || '未命名内容',
    summary: item.summary || '',
    category: publicContentCategory(item),
    collection: publicContentCollection(item),
    tags: publicContentTags(item),
    type: item.type || 'article',
    typeLabel: publicContentTypeLabel(item.type),
    source: item.source || 'manual',
    sourceId: item.sourceId || '',
    slug: item.slug || '',
    href: publicContentHref(item),
    cover: item.cover || '',
    updatedAt: publicContentDate(item) || '',
    updatedTimestamp: Date.parse(publicContentDate(item) || '') || 0,
    accessMode: item.access?.mode || 'public'
  }
  if (body) record.content = truncateUtf8(body)
  return record
}

function normalizeHit(hit = {}) {
  const slug = String(hit.slug || '').replace(/^\/+/, '')
  const href = hit.href || (slug ? `/${slug}` : '/')
  return {
    id: hit.objectID,
    title: hit.title || '未命名内容',
    summary: hit.summary || '',
    slug,
    href,
    category: hit.category || '文章',
    collection: hit.collection || '文章',
    tags: Array.isArray(hit.tags) ? hit.tags : [],
    type: hit.type || 'article',
    source: hit.source || 'notion',
    sourceId: hit.sourceId || hit.objectID,
    cover: hit.cover || hit.pageCover || '',
    date: hit.updatedAt || hit.lastEditedDate || null,
    updatedAt: hit.updatedAt || hit.lastEditedDate || null,
    access: { mode: 'public', allowIndexing: true },
    folder: { path: [hit.category || '文章', hit.collection || '文章'] },
    searchMatch: true
  }
}

export async function searchAlgoliaContent({ query, page = 0, hitsPerPage = 24, category = '', type = '' }) {
  if (!hasAlgoliaSearch() || !String(query || '').trim()) {
    return { available: hasAlgoliaSearch(), hits: [], total: 0, page: 0, pages: 0, processingTimeMS: 0 }
  }
  const { appId, searchKey, indexName } = config()
  const index = algoliasearch(appId, searchKey).initIndex(indexName)
  const facetFilters = []
  if (category && category !== '全部') facetFilters.push(`category:${category}`)
  if (type && type !== '全部') facetFilters.push(`type:${type}`)
  const result = await index.search(String(query).trim(), {
    page: Math.max(0, Number(page) || 0),
    hitsPerPage: Math.min(50, Math.max(1, Number(hitsPerPage) || 24)),
    facetFilters,
    attributesToHighlight: [],
    attributesToSnippet: ['content:28']
  })
  return {
    available: true,
    hits: (result.hits || []).map(normalizeHit),
    total: result.nbHits || 0,
    page: result.page || 0,
    pages: result.nbPages || 0,
    processingTimeMS: result.processingTimeMS || 0
  }
}


export async function upsertAlgoliaContent(item = {}) {
  if (!hasAlgoliaAdmin()) return { available: false, synced: 0 }
  if (!item || item.status !== 'published' || item.access?.mode !== 'public' || item.access?.allowIndexing === false) {
    return { available: true, synced: 0 }
  }
  const { appId, adminKey, indexName } = config()
  const index = algoliasearch(appId, adminKey).initIndex(indexName)
  const task = await index.partialUpdateObject(toAlgoliaRecord(item), { createIfNotExists: true })
  if (task?.wait) await task.wait()
  return { available: true, synced: 1 }
}

export async function syncAlgoliaContent(items = [], options = {}) {
  if (!hasAlgoliaAdmin()) return { available: false, synced: 0, removed: 0 }
  const { appId, adminKey, indexName } = config()
  const index = algoliasearch(appId, adminKey).initIndex(indexName)
  const records = (items || [])
    .filter(item => item && item.access?.mode === 'public' && item.access?.allowIndexing !== false)
    .map(toAlgoliaRecord)
  const activeIds = new Set(records.map(record => String(record.objectID)))

  const settingsTask = await index.setSettings({
    searchableAttributes: ['unordered(title)', 'unordered(summary)', 'unordered(content)', 'category', 'collection', 'tags'],
    attributesForFaceting: ['filterOnly(type)', 'filterOnly(category)', 'filterOnly(source)', 'tags'],
    customRanking: ['desc(updatedTimestamp)']
  })
  if (settingsTask?.wait) await settingsTask.wait()

  const batchSize = 500
  for (let indexStart = 0; indexStart < records.length; indexStart += batchSize) {
    const task = await index.partialUpdateObjects(records.slice(indexStart, indexStart + batchSize), {
      createIfNotExists: true
    })
    if (task?.wait) await task.wait()
  }

  let removed = 0
  if (options.pruneNotion === true) {
    try {
      const staleIds = []
      await index.browseObjects({
        batch(hits = []) {
          hits.forEach(hit => {
            const id = String(hit.objectID || '')
            const notionManaged = hit.source === 'notion' || (!hit.source && hit.slug && hit.lastIndexDate)
            if (notionManaged && id && !activeIds.has(id)) staleIds.push(id)
          })
        }
      })
      for (let indexStart = 0; indexStart < staleIds.length; indexStart += 1000) {
        const task = await index.deleteObjects(staleIds.slice(indexStart, indexStart + 1000))
        if (task?.wait) await task.wait()
      }
      removed = staleIds.length
    } catch (error) {
      console.warn('[content-search] stale Notion Algolia cleanup failed', error)
    }
  }

  return { available: true, synced: records.length, removed }
}

export async function removeAlgoliaContent(item = {}) {
  if (!hasAlgoliaAdmin()) return { available: false, removed: false }
  const { appId, adminKey, indexName } = config()
  const index = algoliasearch(appId, adminKey).initIndex(indexName)
  const task = await index.deleteObject(recordId(item))
  if (task?.wait) await task.wait()
  return { available: true, removed: true }
}
