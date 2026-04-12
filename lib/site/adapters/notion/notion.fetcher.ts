import { getOrSetDataWithCache } from '@/lib/cache/cache_manager'
import { fetchNotionPageBlocks } from '@/lib/db/notion/getPostBlocks'

export async function fetchNotionRecordMap(pageId: string, from?: string) {
  return getOrSetDataWithCache(
    `site_data_${pageId}`,
<<<<<<< HEAD
    async () => fetchNotionPageBlocks(pageId, from, 0),
=======
    async () => fetchNotionPageBlocks(pageId, from),
>>>>>>> upstream/main
    pageId,
    from
  )
}
