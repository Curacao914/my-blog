export const KNOWLEDGE_KINDS = Object.freeze([
  'question',
  'concept',
  'idea',
  'fact',
  'observation',
  'quote',
  'connection'
])

export const KNOWLEDGE_KIND_LABELS = Object.freeze({
  question: '问题',
  concept: '概念',
  idea: '想法',
  fact: '事实',
  observation: '观察',
  quote: '摘录',
  connection: '关联'
})

export const KNOWLEDGE_STATES = Object.freeze([
  'exploring',
  'active',
  'archived'
])

export const KNOWLEDGE_STATE_LABELS = Object.freeze({
  exploring: '探索中',
  active: '活跃',
  archived: '已归档'
})

export const KNOWLEDGE_REVIEW_STATUSES = Object.freeze([
  'needs_review',
  'reviewed'
])

export const KNOWLEDGE_REVIEW_STATUS_LABELS = Object.freeze({
  needs_review: '待核验',
  reviewed: '已核验'
})

const DEFAULT_KIND = 'idea'
const DEFAULT_STATE = 'exploring'
const DEFAULT_REVIEW_STATUS = 'needs_review'
const MAX_TAGS = 8

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return []

  const seen = new Set()
  const tags = []

  for (const candidate of value) {
    const tag = cleanText(candidate)
    const key = tag.toLocaleLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length === MAX_TAGS) break
  }

  return tags
}

function normalizeProvenance(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map(item => ({ ...item }))
}

export function normalizeKnowledgeDraft(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {}

  return {
    title: cleanText(source.title),
    summary: cleanText(source.summary),
    bodyMarkdown: cleanText(source.bodyMarkdown),
    kind: KNOWLEDGE_KINDS.includes(source.kind) ? source.kind : DEFAULT_KIND,
    state: KNOWLEDGE_STATES.includes(source.state) ? source.state : DEFAULT_STATE,
    domain: cleanText(source.domain),
    topic: cleanText(source.topic),
    seedText: cleanText(source.seedText),
    tags: normalizeTags(source.tags),
    reviewStatus: KNOWLEDGE_REVIEW_STATUSES.includes(source.reviewStatus)
      ? source.reviewStatus
      : DEFAULT_REVIEW_STATUS,
    provenance: normalizeProvenance(source.provenance),
    showOnHome: source.showOnHome === true
  }
}

export function buildKnowledgeSearchText(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {}
  const values = [
    source.title,
    source.summary,
    source.bodyMarkdown,
    source.domain,
    source.topic,
    ...(Array.isArray(source.tags) ? source.tags : []),
    source.seedText
  ]

  return values
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
}

export function mapKnowledgeRecord(
  item = {},
  entry = {},
  version = {},
  display = {}
) {
  return {
    id: item.id || '',
    ownerId: item.owner_id || '',
    slug: item.slug || '',
    title: item.title || '',
    summary: item.summary || '',
    type: item.type || 'knowledge',
    status: item.status || 'draft',
    kind: entry.kind || DEFAULT_KIND,
    state: entry.state || DEFAULT_STATE,
    domain: entry.domain || '',
    topic: entry.topic || '',
    seedText: entry.seed_text || '',
    reviewStatus: entry.review_status || DEFAULT_REVIEW_STATUS,
    provenance: Array.isArray(entry.provenance) ? entry.provenance : [],
    showOnHome: entry.show_on_home === true,
    searchText: entry.search_text || '',
    bodyMarkdown: version.body_markdown || '',
    versionId: version.id || '',
    version: version.version || 0,
    checksum: version.checksum || '',
    tags: Array.isArray(display.tags) ? display.tags : [],
    folderPath: Array.isArray(display.folder_path) ? display.folder_path : [],
    createdAt: item.created_at || null,
    updatedAt: entry.updated_at || item.updated_at || null
  }
}
