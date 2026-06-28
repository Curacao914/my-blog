import crypto from 'crypto'

import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import notionAPI from '@/lib/db/notion/getNotionAPI'
import { mirrorNotionRecordMapImages } from '@/lib/server/r2Assets'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import {
  addNotionRelayBatchPage,
  createNotionRelayBatch,
  failNotionRelayBatch,
  isNotionRelayEnabled,
  promoteNotionRelayBatch,
  upsertNotionRelaySnapshot
} from '@/lib/content/notionRelayRepository'

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = stable(value[key])
    return result
  }, {})
}

function checksum(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex')
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function relayPages(siteData) {
  return (siteData?.allPages || []).filter(page => {
    if (!page?.id || !page?.slug || page.slug === 'oops') return false
    if (page.status !== 'Published') return false
    const type = String(page.type || '')
    return !type.includes('Menu') && (type.includes('Post') || type.includes('Page'))
  })
}

function siteDataForStorage(siteData) {
  const result = clone(siteData)
  result.allPages = (result.allPages || []).map(page => {
    const copy = { ...page }
    delete copy.blockMap
    delete copy.content
    delete copy.toc
    return copy
  })
  return result
}

function postDataForStorage(page) {
  const copy = clone(page)
  delete copy.blockMap
  delete copy.content
  delete copy.toc
  return copy
}

export async function syncNotionRelay({ triggeredBy } = {}) {
  if (!isNotionRelayEnabled()) {
    return { enabled: false, skipped: true, reason: 'NOTION_RELAY_ENABLED is not true' }
  }

  const liveSiteData = await fetchGlobalAllData({
    pageId: BLOG.NOTION_PAGE_ID,
    from: 'notion-relay-sync'
  })
  const pages = relayPages(liveSiteData)
  if (!pages.length) {
    throw new Error('Notion relay refused to publish an empty page set')
  }

  const batch = await createNotionRelayBatch({
    sourceSiteId: BLOG.NOTION_PAGE_ID,
    siteData: siteDataForStorage(liveSiteData),
    triggeredBy
  })
  if (!batch?.id) throw new Error('Unable to create Notion relay batch')

  const stats = {
    pages: pages.length,
    snapshots: 0,
    mirroredImages: 0,
    reusedSnapshots: 0,
    failures: 0
  }

  try {
    for (let index = 0; index < pages.length; index++) {
      const page = pages[index]
      let rawRecordMap = null
      let lastError = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          rawRecordMap = await notionAPI.getPage(page.id)
          break
        } catch (error) {
          lastError = error
        }
      }
      if (!rawRecordMap) {
        throw lastError || new Error(`Notion page ${page.slug} could not be fetched`)
      }
      if (!rawRecordMap?.block || !Object.keys(rawRecordMap.block).length) {
        throw new Error(`Notion page ${page.slug} returned an empty block map`)
      }

      const adapted = adapterNotionBlockMap(rawRecordMap)
      const formatted = {
        ...adapted,
        block: formatNotionBlock(adapted.block)
      }
      const mirrored = await mirrorNotionRecordMapImages(formatted)
      const postData = postDataForStorage(page)
      const pageChecksum = checksum({
        postData,
        blockMap: mirrored.recordMap,
        assetManifest: mirrored.manifest
      })
      const snapshot = await upsertNotionRelaySnapshot({
        pageId: page.id,
        checksum: pageChecksum,
        postData,
        blockMap: mirrored.recordMap,
        assetManifest: mirrored.manifest
      })
      if (!snapshot?.id) {
        throw new Error(`Notion page ${page.slug} snapshot could not be saved`)
      }

      await addNotionRelayBatchPage({
        batchId: batch.id,
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        snapshotId: snapshot.id,
        sortOrder: index
      })
      stats.snapshots += 1
      stats.mirroredImages += mirrored.manifest.length
    }

    await promoteNotionRelayBatch(batch.id, stats)
    return {
      enabled: true,
      promoted: true,
      batchId: batch.id,
      ...stats
    }
  } catch (error) {
    stats.failures += 1
    await failNotionRelayBatch(
      batch.id,
      error instanceof Error ? error.message : 'Relay sync failed',
      stats
    ).catch(failError => {
      console.error('[notion relay] unable to mark failed batch', failError)
    })
    throw error
  }
}
