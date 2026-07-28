import { createHash, randomUUID } from 'crypto'
import {
  buildKnowledgeSearchText,
  mapKnowledgeRecord,
  normalizeKnowledgeDraft
} from '@/lib/knowledge/model'
import { supabaseRest } from '@/lib/server/supabase'

const KNOWLEDGE_TYPE = 'knowledge'
const KNOWLEDGE_CATEGORY = '轻知识'
const MAX_LIST_LIMIT = 100
const draftFields = [
  'title',
  'summary',
  'bodyMarkdown',
  'kind',
  'state',
  'domain',
  'topic',
  'seedText',
  'tags',
  'reviewStatus',
  'provenance',
  'showOnHome'
]

function repositoryError(message, status, code) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function requireOwnerId(ownerId) {
  const value = typeof ownerId === 'string' ? ownerId.trim() : ''
  if (!value) throw repositoryError('Knowledge owner is required', 400, 'owner_required')
  return value
}

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function itemIdsFilter(ids) {
  return ids.map(id => encodeURIComponent(id)).join(',')
}

function checksum(bodyMarkdown) {
  return createHash('sha256').update(bodyMarkdown).digest('hex')
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key)
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return MAX_LIST_LIMIT
  return Math.min(parsed, MAX_LIST_LIMIT)
}

function latestVersionsByItemId(rows = []) {
  const versions = new Map()
  for (const row of rows) {
    const current = versions.get(row.item_id)
    if (!current || Number(row.version || 0) > Number(current.version || 0)) {
      versions.set(row.item_id, row)
    }
  }
  return versions
}

function rowsByItemId(rows = []) {
  return new Map(rows.map(row => [row.item_id, row]))
}

function itemsById(rows = []) {
  return new Map(rows.map(row => [row.id, row]))
}

function notFound() {
  return repositoryError('Knowledge entry not found', 404, 'knowledge_not_found')
}

function validateDraft(draft) {
  if (!draft.title) {
    throw repositoryError('Knowledge title is required', 400, 'title_required')
  }
  if (!draft.bodyMarkdown) {
    throw repositoryError('Knowledge body is required', 400, 'body_required')
  }
}

function privateAccess(itemId) {
  return {
    item_id: itemId,
    mode: 'private',
    password_hash: null,
    expires_at: null,
    allow_indexing: false,
    allow_rss: false,
    allow_sitemap: false
  }
}

function displayPayload(itemId, draft) {
  return {
    item_id: itemId,
    category: KNOWLEDGE_CATEGORY,
    tags: draft.tags,
    folder_path: [
      KNOWLEDGE_CATEGORY,
      ...(draft.domain ? [draft.domain] : [])
    ],
    pinned: false,
    show_in_recent: false
  }
}

function entryPayload(ownerId, itemId, draft) {
  return {
    item_id: itemId,
    owner_id: ownerId,
    kind: draft.kind,
    state: draft.state,
    domain: draft.domain || null,
    topic: draft.topic || null,
    seed_text: draft.seedText || null,
    review_status: draft.reviewStatus,
    provenance: draft.provenance,
    show_on_home: draft.showOnHome,
    search_text: buildKnowledgeSearchText(draft)
  }
}

function explicitShowOnHome(filters) {
  const value = hasOwn(filters, 'showOnHome')
    ? filters.showOnHome
    : filters.show_on_home
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return null
}

export async function listKnowledgeEntries(ownerId, filters = {}) {
  const owner = requireOwnerId(ownerId)
  const source = filters && typeof filters === 'object' ? filters : {}
  const params = [
    'select=*',
    `owner_id=${eq(owner)}`
  ]

  if (source.state) {
    params.push(`state=${eq(source.state)}`)
  } else {
    params.push('state=neq.archived')
  }
  if (source.kind) params.push(`kind=${eq(source.kind)}`)
  if (source.domain) params.push(`domain=${eq(source.domain)}`)

  const showOnHome = explicitShowOnHome(source)
  if (showOnHome !== null) params.push(`show_on_home=eq.${showOnHome}`)

  const query = typeof source.q === 'string' ? source.q.trim() : ''
  if (query) params.push(`search_text=ilike.*${encodeURIComponent(query)}*`)
  params.push('order=updated_at.desc')
  params.push(`limit=${normalizeLimit(source.limit)}`)

  const entries = await supabaseRest(`/knowledge_entries?${params.join('&')}`)
  if (!entries?.length) return []

  const ids = [...new Set(entries.map(entry => entry.item_id).filter(Boolean))]
  if (!ids.length) return []
  const idsFilter = itemIdsFilter(ids)

  const [items, versions, displayRows] = await Promise.all([
    supabaseRest(
      `/content_items?select=*&owner_id=${eq(owner)}&type=eq.${KNOWLEDGE_TYPE}&id=in.(${idsFilter})`
    ),
    supabaseRest(
      `/content_versions?select=*&item_id=in.(${idsFilter})&order=version.desc`
    ),
    supabaseRest(
      `/content_display?select=*&item_id=in.(${idsFilter})`
    )
  ])

  const itemMap = itemsById(items)
  const versionMap = latestVersionsByItemId(versions)
  const displayMap = rowsByItemId(displayRows)

  return entries
    .map(entry => {
      const item = itemMap.get(entry.item_id)
      if (!item) return null
      return mapKnowledgeRecord(
        item,
        entry,
        versionMap.get(entry.item_id) || {},
        displayMap.get(entry.item_id) || {}
      )
    })
    .filter(Boolean)
}

export async function getKnowledgeEntry(ownerId, id) {
  const owner = requireOwnerId(ownerId)
  const itemRows = await supabaseRest(
    `/content_items?select=*&id=${eq(id)}&owner_id=${eq(owner)}&type=eq.${KNOWLEDGE_TYPE}&limit=1`
  )
  const item = itemRows?.[0]
  if (!item) throw notFound()

  const [entryRows, versionRows, displayRows] = await Promise.all([
    supabaseRest(
      `/knowledge_entries?select=*&item_id=${eq(id)}&owner_id=${eq(owner)}&limit=1`
    ),
    supabaseRest(
      `/content_versions?select=*&item_id=${eq(id)}&order=version.desc&limit=1`
    ),
    supabaseRest(
      `/content_display?select=*&item_id=${eq(id)}&limit=1`
    )
  ])
  const entry = entryRows?.[0]
  if (!entry) throw notFound()

  return mapKnowledgeRecord(
    item,
    entry,
    versionRows?.[0] || {},
    displayRows?.[0] || {}
  )
}

export async function createKnowledgeEntry(ownerId, input = {}) {
  const owner = requireOwnerId(ownerId)
  const draft = normalizeKnowledgeDraft(input)
  validateDraft(draft)

  let createdItem = null
  try {
    const itemRows = await supabaseRest('/content_items?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        owner_id: owner,
        slug: `knowledge-${randomUUID()}`,
        title: draft.title,
        type: KNOWLEDGE_TYPE,
        status: 'draft',
        source: 'manual',
        source_id: null,
        summary: draft.summary || null
      })
    })
    createdItem = itemRows?.[0]
    if (!createdItem?.id) {
      throw repositoryError(
        'Knowledge item could not be created',
        500,
        'knowledge_create_failed'
      )
    }

    const versionRows = await supabaseRest('/content_versions?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        item_id: createdItem.id,
        version: 1,
        body_markdown: draft.bodyMarkdown,
        checksum: checksum(draft.bodyMarkdown),
        is_published: false
      })
    })
    await supabaseRest('/content_access?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(privateAccess(createdItem.id))
    })
    const displayRows = await supabaseRest('/content_display?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(displayPayload(createdItem.id, draft))
    })
    const entryRows = await supabaseRest('/knowledge_entries?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(entryPayload(owner, createdItem.id, draft))
    })

    return mapKnowledgeRecord(
      createdItem,
      entryRows?.[0] || entryPayload(owner, createdItem.id, draft),
      versionRows?.[0] || {},
      displayRows?.[0] || displayPayload(createdItem.id, draft)
    )
  } catch (error) {
    if (createdItem?.id) {
      try {
        await supabaseRest(
          `/content_items?id=${eq(createdItem.id)}&owner_id=${eq(owner)}&type=eq.${KNOWLEDGE_TYPE}`,
          { method: 'DELETE' }
        )
      } catch {
        // The original write error is more useful; cascading cleanup is best effort.
      }
    }
    throw error
  }
}

export async function updateKnowledgeEntry(ownerId, id, input = {}) {
  const owner = requireOwnerId(ownerId)
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {}
  const explicitFields = draftFields.filter(field => hasOwn(source, field))
  if (!explicitFields.length) {
    throw repositoryError(
      'No knowledge fields to update',
      400,
      'no_update_fields'
    )
  }

  const current = await getKnowledgeEntry(owner, id)
  const draft = normalizeKnowledgeDraft({
    title: hasOwn(source, 'title') ? source.title : current.title,
    summary: hasOwn(source, 'summary') ? source.summary : current.summary,
    bodyMarkdown: hasOwn(source, 'bodyMarkdown')
      ? source.bodyMarkdown
      : current.bodyMarkdown,
    kind: hasOwn(source, 'kind') ? source.kind : current.kind,
    state: hasOwn(source, 'state') ? source.state : current.state,
    domain: hasOwn(source, 'domain') ? source.domain : current.domain,
    topic: hasOwn(source, 'topic') ? source.topic : current.topic,
    seedText: hasOwn(source, 'seedText') ? source.seedText : current.seedText,
    tags: hasOwn(source, 'tags') ? source.tags : current.tags,
    reviewStatus: hasOwn(source, 'reviewStatus')
      ? source.reviewStatus
      : current.reviewStatus,
    provenance: hasOwn(source, 'provenance')
      ? source.provenance
      : current.provenance,
    showOnHome: hasOwn(source, 'showOnHome')
      ? source.showOnHome
      : current.showOnHome
  })
  validateDraft(draft)

  const updatedAt = new Date().toISOString()
  const itemPatch = { updated_at: updatedAt }
  if (hasOwn(source, 'title')) itemPatch.title = draft.title
  if (hasOwn(source, 'summary')) itemPatch.summary = draft.summary || null
  await supabaseRest(
    `/content_items?id=${eq(id)}&owner_id=${eq(owner)}&type=eq.${KNOWLEDGE_TYPE}&select=*`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(itemPatch)
    }
  )

  const bodyWasUpdated = hasOwn(source, 'bodyMarkdown')
  const nextChecksum = bodyWasUpdated
    ? checksum(draft.bodyMarkdown)
    : current.checksum
  let nextVersion = current.version
  let nextVersionId = current.versionId
  if (bodyWasUpdated && nextChecksum !== current.checksum) {
    nextVersion = Number(current.version || 0) + 1
    const versionRows = await supabaseRest('/content_versions?select=*', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        item_id: id,
        version: nextVersion,
        body_markdown: draft.bodyMarkdown,
        checksum: nextChecksum,
        is_published: false
      })
    })
    nextVersionId = versionRows?.[0]?.id || ''
  }

  await supabaseRest('/content_access?on_conflict=item_id&select=*', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(privateAccess(id))
  })

  const display = {
    ...displayPayload(id, draft),
    updated_at: updatedAt
  }
  await supabaseRest(`/content_display?item_id=${eq(id)}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(display)
  })

  const entry = {
    ...entryPayload(owner, id, draft),
    updated_at: updatedAt
  }
  await supabaseRest(
    `/knowledge_entries?item_id=${eq(id)}&owner_id=${eq(owner)}&select=*`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(entry)
    }
  )

  return {
    ...current,
    title: draft.title,
    summary: draft.summary,
    bodyMarkdown: draft.bodyMarkdown,
    kind: draft.kind,
    state: draft.state,
    domain: draft.domain,
    topic: draft.topic,
    seedText: draft.seedText,
    tags: draft.tags,
    reviewStatus: draft.reviewStatus,
    provenance: draft.provenance,
    showOnHome: draft.showOnHome,
    searchText: entry.search_text,
    folderPath: display.folder_path,
    version: nextVersion,
    versionId: nextVersionId,
    checksum: nextChecksum,
    updatedAt
  }
}

export async function archiveKnowledgeEntry(ownerId, id) {
  const owner = requireOwnerId(ownerId)
  const current = await getKnowledgeEntry(owner, id)
  const updatedAt = new Date().toISOString()
  const rows = await supabaseRest(
    `/knowledge_entries?item_id=${eq(id)}&owner_id=${eq(owner)}&select=*`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        state: 'archived',
        updated_at: updatedAt
      })
    }
  )
  if (!rows?.[0]) throw notFound()
  return {
    ...current,
    state: 'archived',
    updatedAt
  }
}
