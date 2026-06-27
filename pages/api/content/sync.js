import BLOG from '@/blog.config'

import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { delCacheData } from '@/lib/cache/cache_manager'
import { syncAlgoliaContent } from '@/lib/content/algoliaSearch'
import { clearPublicContentIndexCache, loadPublicContentIndex } from '@/lib/content/publicIndex'
import { clearNotionTaxonomyCache } from '@/lib/content/notionTaxonomy'
import { enrichNotionSearchBodies } from '@/lib/content/notionSearch'


function cleanPath(value) {
  const raw = String(value || '').split('#')[0].split('?')[0].trim()
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.length > 500) return '/'
  return raw.replace(/\/{2,}/g, '/') || '/'
}

function notionIds() {
  return String(BLOG.NOTION_PAGE_ID || '')
    .split(',')
    .map(value => value.trim().replace(/^[a-z]{2}:/i, ''))
    .filter(Boolean)
}

async function clearNotionCaches() {
  const ids = notionIds()
  await Promise.all(ids.flatMap(id => [
    delCacheData(`site_${id}`),
    delCacheData(`page_block_${id}`)
  ]))
  clearPublicContentIndexCache()
  clearNotionTaxonomyCache()
  return ids.length
}

async function revalidatePaths(res, pathname = '/', items = []) {
  pathname = cleanPath(pathname)
  const locale = /^\/[a-z]{2}(?:-[A-Z]{2})?(?:\/|$)/.exec(pathname)?.[0]?.replace(/\/$/, '') || ''
  const basePaths = ['/', '/content', '/search', '/archive', '/category', '/tag']
  const localizedPaths = locale
    ? basePaths.map(path => path === '/' ? locale : `${locale}${path}`)
    : []
  const paths = new Set([
    ...(pathname.startsWith('/desk') || pathname.startsWith('/api') ? [] : [pathname]),
    ...basePaths,
    ...localizedPaths
  ])
  const categories = new Set()
  const tags = new Set()
  ;(items || []).forEach(item => {
    const category = item.display?.category || item.category || item.folder?.path?.[0]
    if (category) categories.add(String(category))
    ;(item.display?.tags || item.tags || []).forEach(tag => { if (tag) tags.add(String(tag)) })
  })
  ;[...categories].slice(0, 20).forEach(category => {
    const suffix = `/category/${encodeURIComponent(category)}`
    paths.add(suffix)
    if (locale) paths.add(`${locale}${suffix}`)
  })
  ;[...tags].slice(0, 40).forEach(tag => {
    const suffix = `/tag/${encodeURIComponent(tag)}`
    paths.add(suffix)
    if (locale) paths.add(`${locale}${suffix}`)
  })
  ;(items || []).slice(0, 80).forEach(item => {
    const href = String(item?.href || (item?.slug ? `/content/${item.slug}` : '')).trim()
    if (!href.startsWith('/') || href.startsWith('//')) return
    const detail = cleanPath(href)
    paths.add(detail)
    if (locale && !detail.startsWith(`${locale}/`) && detail !== locale) paths.add(`${locale}${detail === '/' ? '' : detail}`)
  })

  const revalidated = []
  const failed = []
  const pathList = [...paths]
  const batchSize = 6
  for (let index = 0; index < pathList.length; index += batchSize) {
    const batch = pathList.slice(index, index + batchSize)
    const results = await Promise.allSettled(batch.map(path => res.revalidate(path)))
    results.forEach((result, resultIndex) => {
      const path = batch[resultIndex]
      if (result.status === 'fulfilled') revalidated.push(path)
      else failed.push({
        path,
        error: result.reason instanceof Error ? result.reason.message : 'revalidate failed'
      })
    })
  }
  return { revalidated, failed }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    const clearedSites = await clearNotionCaches()
    const { items, source } = await loadPublicContentIndex({
      from: 'admin-content-sync',
      bypassCache: true,
      includeBody: true
    })
    const notionSearch = await enrichNotionSearchBodies(items, {
      bypassCache: true,
      concurrency: 3
    })
    let algolia
    try {
      algolia = await syncAlgoliaContent(notionSearch.items, {
        pruneNotion: String(source || '').split('+').includes('notion')
      })
    } catch (error) {
      console.warn('[content sync] Algolia sync failed', error)
      algolia = {
        available: true,
        synced: 0,
        error: error instanceof Error ? error.message : 'Algolia sync failed'
      }
    }
    const pages = await revalidatePaths(res, String(req.body?.path || '/'), items)
    const warnings = []
    if (clearedSites && !String(source || '').split('+').includes('notion')) warnings.push('Notion 内容未能重新读取，已保留其他公开来源')
    if (notionSearch.failed) warnings.push(`${notionSearch.failed} 篇 Notion 正文未能更新索引`)
    if (algolia.error) warnings.push('Algolia 同步失败，站内索引仍可使用')
    if (pages.failed.length) warnings.push(`${pages.failed.length} 个页面刷新失败`)
    return res.status(200).json({
      ok: warnings.length === 0,
      contentCount: items.length,
      source,
      clearedSites,
      notionSearch: {
        total: notionSearch.total,
        enriched: notionSearch.enriched,
        failed: notionSearch.failed
      },
      algolia,
      warnings,
      ...pages,
      syncedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('[content sync] failed', error)
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Content sync failed'
    })
  }
}
