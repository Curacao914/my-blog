import { resolvePostProps, fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import {
  getActiveNotionRelayPost,
  getActiveNotionRelaySiteData
} from '@/lib/content/notionRelayRepository'
import { deepClone } from '@/lib/utils'
import { processPostData } from '@/lib/utils/post'

function fullSlug({ prefix, slug, suffix }) {
  const segments = [prefix, slug].filter(Boolean)
  if (Array.isArray(suffix)) segments.push(...suffix)
  return segments.join('/')
}

export async function fetchGlobalAllDataWithRelay(options = {}) {
  const relaySiteData = await getActiveNotionRelaySiteData()
  if (relaySiteData) return deepClone(relaySiteData)
  return fetchGlobalAllData(options)
}

export async function resolvePostPropsWithRelay(options = {}) {
  const slug = fullSlug(options)
  const relay = await getActiveNotionRelayPost(slug)
  if (!relay?.snapshot) return resolvePostProps(options)

  const siteData = deepClone(relay.batch.site_data || {})
  const postData = deepClone(relay.snapshot.post_data || {})
  const blockMap = deepClone(relay.snapshot.block_map || {})
  const props = {
    ...siteData,
    post: {
      ...postData,
      blockMap
    },
    NOTION_RELAY: {
      batchId: relay.batch.id,
      checksum: relay.snapshot.checksum,
      promotedAt: relay.batch.promoted_at || null
    }
  }

  await processPostData(props, options.from || `relay-${slug}`)
  return props
}
