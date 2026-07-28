import { suggestKnowledgeRelations } from '@/lib/knowledge/relations'
import {
  getKnowledgeEntry,
  knowledgeRepositoryError,
  listKnowledgeEntries
} from '@/lib/server/knowledgeRepository'
import { supabaseRest } from '@/lib/server/supabase'

const TARGET_TYPES = new Set(['knowledge', 'note', 'reading', 'course', 'writing', 'today'])
const RELATION_TYPES = new Set(['related', 'derived_from', 'developed_into', 'supports', 'challenges'])
const DECISIONS = new Set(['confirmed', 'dismissed'])

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function relationError(message, status, code) {
  return knowledgeRepositoryError(message, status, code)
}

function mapRelation(row, target = null) {
  return {
    id: row.id,
    sourceItemId: row.source_item_id,
    targetType: row.target_type,
    targetId: row.target_id,
    relationType: row.relation_type,
    origin: row.origin,
    status: row.status,
    score: Number(row.score || 0),
    note: row.note || '',
    metadata: row.metadata || {},
    target,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }
}

export async function listKnowledgeRelations(ownerId, sourceItemId) {
  await getKnowledgeEntry(ownerId, sourceItemId)
  const rows = await supabaseRest(
    `/knowledge_links?select=*&owner_id=${eq(ownerId)}&source_item_id=${eq(sourceItemId)}` +
    '&status=neq.dismissed&order=status.asc,score.desc,created_at.desc'
  )
  const knowledgeIds = [...new Set(
    (rows || []).filter(row => row.target_type === 'knowledge').map(row => row.target_id)
  )]
  const targetMap = new Map()
  if (knowledgeIds.length) {
    const candidates = await listKnowledgeEntries(ownerId, { limit: 100 })
    candidates.forEach(candidate => targetMap.set(candidate.id, candidate))
  }
  return (rows || []).map(row => mapRelation(row, targetMap.get(row.target_id) || null))
}

export async function refreshKnowledgeSuggestions(ownerId, sourceItemId) {
  const source = await getKnowledgeEntry(ownerId, sourceItemId)
  const [candidates, existing] = await Promise.all([
    listKnowledgeEntries(ownerId, { limit: 100 }),
    supabaseRest(
      `/knowledge_links?select=target_type,target_id,relation_type,status&owner_id=${eq(ownerId)}` +
      `&source_item_id=${eq(sourceItemId)}`
    )
  ])
  const keys = new Set((existing || []).map(row => `${row.target_type}:${row.target_id}:${row.relation_type}`))
  const missing = suggestKnowledgeRelations(source, candidates)
    .filter(item => !keys.has(`${item.targetType}:${item.targetId}:${item.relationType}`))
    .map(item => ({
      owner_id: ownerId,
      source_item_id: sourceItemId,
      target_type: item.targetType,
      target_id: item.targetId,
      relation_type: item.relationType,
      origin: 'rule',
      status: 'suggested',
      score: item.score,
      metadata: { reasons: item.reasons }
    }))
  if (missing.length) {
    await supabaseRest('/knowledge_links', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(missing)
    })
  }
  return { created: missing.length }
}

export async function createKnowledgeRelation(ownerId, sourceItemId, input = {}) {
  await getKnowledgeEntry(ownerId, sourceItemId)
  const targetType = TARGET_TYPES.has(input.targetType) ? input.targetType : ''
  const targetId = String(input.targetId || '').trim()
  const relationType = RELATION_TYPES.has(input.relationType) ? input.relationType : 'related'
  if (!targetType || !targetId) throw relationError('关联目标不能为空', 400, 'relation_target_required')
  if (targetType === 'knowledge') await getKnowledgeEntry(ownerId, targetId)

  const rows = await supabaseRest('/knowledge_links?on_conflict=source_item_id,target_type,target_id,relation_type&select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      owner_id: ownerId,
      source_item_id: sourceItemId,
      target_type: targetType,
      target_id: targetId,
      relation_type: relationType,
      origin: 'user',
      status: 'confirmed',
      score: 1,
      note: String(input.note || '').trim() || null,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
    })
  })
  return mapRelation(rows?.[0] || {})
}

export async function updateKnowledgeRelation(ownerId, sourceItemId, relationId, status) {
  if (!uuid(relationId) || !DECISIONS.has(status)) {
    throw relationError('无效的关联操作', 400, 'relation_update_invalid')
  }
  await getKnowledgeEntry(ownerId, sourceItemId)
  const rows = await supabaseRest(
    `/knowledge_links?id=${eq(relationId)}&owner_id=${eq(ownerId)}&source_item_id=${eq(sourceItemId)}&select=*`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    }
  )
  if (!rows?.[0]) throw relationError('关联不存在', 404, 'relation_not_found')
  return mapRelation(rows[0])
}
