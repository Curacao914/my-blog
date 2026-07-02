import { idToUuid } from 'notion-utils'

import { delCacheData } from '@/lib/cache/cache_manager'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import {
  fetchNotionPageBlocks,
  formatNotionBlock
} from '@/lib/db/notion/getPostBlocks'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'

function normalizedId(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    return idToUuid(raw)
  } catch {
    return raw
  }
}

async function readNotionBody(item, options = {}) {
  const sourceId = String(item?.sourceId || '').trim()
  if (!sourceId) return ''
  const pageId = normalizedId(sourceId)

  if (options.bypassCache !== false) {
    await Promise.all([
      delCacheData(`page_block_${sourceId}`),
      pageId !== sourceId ? delCacheData(`page_block_${pageId}`) : Promise.resolve()
    ])
  }

  const raw = await fetchNotionPageBlocks(sourceId, 'content-search-sync')
  if (!raw) return ''
  const adapted = adapterNotionBlockMap(raw)
  const blockMap = {
    ...adapted,
    block: formatNotionBlock(adapted?.block || {})
  }
  const root = blockMap.block?.[pageId]?.value || blockMap.block?.[sourceId]?.value
  const content = Array.isArray(root?.content) ? root.content : []
  if (!content.length) return ''

  return getPageContentText(
    { id: pageId, content, password: false },
    blockMap
  )
}

export async function enrichNotionSearchBodies(items = [], options = {}) {
  const output = [...(items || [])]
  const indexes = output
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item?.source === 'notion' && item?.sourceId)
  const concurrency = Math.max(1, Math.min(6, Number(options.concurrency) || 3))
  let cursor = 0
  let enriched = 0
  let failed = 0

  async function worker() {
    while (cursor < indexes.length) {
      const current = indexes[cursor]
      cursor += 1
      try {
        const content = await readNotionBody(current.item, options)
        if (content) {
          output[current.index] = { ...current.item, content }
          enriched += 1
        }
      } catch (error) {
        failed += 1
        console.warn('[content-search] Notion body read failed', {
          sourceId: current.item?.sourceId || '',
          message: error instanceof Error ? error.message : 'unknown error'
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, indexes.length) }, worker))
  return {
    items: output,
    total: indexes.length,
    enriched,
    failed
  }
}
