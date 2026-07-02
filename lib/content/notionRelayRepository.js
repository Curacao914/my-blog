import { supabaseRest } from '@/lib/server/supabase'

let activeCache = null
let activeCacheExpiresAt = 0

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

export function isNotionRelayEnabled() {
  return String(process.env.NOTION_RELAY_ENABLED || '').toLowerCase() === 'true'
}

export function clearNotionRelayCache() {
  activeCache = null
  activeCacheExpiresAt = 0
}

export async function createNotionRelayBatch({ sourceSiteId, siteData, triggeredBy }) {
  const rows = await supabaseRest('/notion_relay_batches?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      status: 'staging',
      source_site_id: sourceSiteId || null,
      site_data: siteData || {},
      triggered_by: triggeredBy || null
    })
  })
  return rows?.[0] || null
}

export async function upsertNotionRelaySnapshot({
  pageId,
  checksum,
  postData,
  blockMap,
  assetManifest
}) {
  const rows = await supabaseRest(
    '/notion_relay_snapshots?on_conflict=page_id,checksum&select=id,page_id,checksum',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        page_id: pageId,
        checksum,
        post_data: postData,
        block_map: blockMap,
        asset_manifest: assetManifest || []
      })
    }
  )
  return rows?.[0] || null
}

export async function addNotionRelayBatchPage({
  batchId,
  pageId,
  slug,
  title,
  snapshotId,
  sortOrder
}) {
  const rows = await supabaseRest(
    '/notion_relay_batch_pages?on_conflict=batch_id,page_id&select=*',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        batch_id: batchId,
        page_id: pageId,
        slug,
        title: title || null,
        snapshot_id: snapshotId,
        sort_order: Number(sortOrder) || 0
      })
    }
  )
  return rows?.[0] || null
}

export async function failNotionRelayBatch(batchId, error, stats = {}) {
  return supabaseRest(`/notion_relay_batches?id=${eq(batchId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'failed',
      error: String(error || 'Relay sync failed').slice(0, 4000),
      stats,
      completed_at: new Date().toISOString()
    })
  })
}

export async function promoteNotionRelayBatch(batchId, stats = {}) {
  await supabaseRest('/notion_relay_batches?id=' + eq(batchId), {
    method: 'PATCH',
    body: JSON.stringify({ stats })
  })
  const result = await supabaseRest('/rpc/promote_notion_relay_batch', {
    method: 'POST',
    body: JSON.stringify({ p_batch_id: batchId })
  })
  clearNotionRelayCache()
  return result
}

async function loadActiveBatch() {
  const stateRows = await supabaseRest(
    '/notion_relay_state?select=active_batch_id,previous_batch_id,updated_at&singleton=eq.true&limit=1'
  )
  const state = stateRows?.[0]
  if (!state?.active_batch_id) return null

  const batches = await supabaseRest(
    `/notion_relay_batches?select=id,status,source_site_id,site_data,stats,promoted_at,created_at&id=${eq(state.active_batch_id)}&limit=1`
  )
  const batch = batches?.[0]
  if (!batch) return null
  return { state, batch }
}

export async function getActiveNotionRelay() {
  if (!isNotionRelayEnabled()) return null
  if (activeCache && activeCacheExpiresAt > Date.now()) return activeCache

  try {
    activeCache = await loadActiveBatch()
    activeCacheExpiresAt = Date.now() + 60_000
    return activeCache
  } catch (error) {
    console.warn('[notion relay] active batch unavailable', error)
    return null
  }
}

export async function getActiveNotionRelaySiteData() {
  const active = await getActiveNotionRelay()
  return active?.batch?.site_data || null
}

export async function getActiveNotionRelayPost(slug) {
  const active = await getActiveNotionRelay()
  const batchId = active?.batch?.id
  if (!batchId || !slug) return null

  const mappings = await supabaseRest(
    `/notion_relay_batch_pages?select=page_id,slug,title,snapshot_id,sort_order&batch_id=${eq(batchId)}&slug=${eq(slug)}&limit=1`
  )
  const mapping = mappings?.[0]
  if (!mapping?.snapshot_id) return null

  const snapshots = await supabaseRest(
    `/notion_relay_snapshots?select=id,page_id,checksum,post_data,block_map,asset_manifest,created_at&id=${eq(mapping.snapshot_id)}&limit=1`
  )
  const snapshot = snapshots?.[0]
  if (!snapshot) return null

  return {
    batch: active.batch,
    mapping,
    snapshot
  }
}
