import { listKnowledgeEntries } from '@/lib/server/knowledgeRepository'
import { supabaseRest } from '@/lib/server/supabase'

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

export async function getKnowledgeNetwork(ownerId) {
  const [entries, rows] = await Promise.all([
    listKnowledgeEntries(ownerId, { limit: 100 }),
    supabaseRest(
      `/knowledge_links?select=source_item_id,target_id,relation_type,note` +
      `&owner_id=${eq(ownerId)}&target_type=eq.knowledge&status=eq.confirmed`
    )
  ])
  const ids = new Set(entries.map(entry => entry.id))
  const links = (rows || [])
    .filter(row => ids.has(row.source_item_id) && ids.has(row.target_id))
    .map(row => ({
      sourceId: row.source_item_id,
      targetId: row.target_id,
      type: row.relation_type,
      reason: row.note || ''
    }))
  return { entries, links }
}
