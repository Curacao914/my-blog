function clean(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('zh-CN')
}

function grams(value) {
  const text = clean(value).replace(/\s+/g, '')
  if (text.length < 2) return new Set(text ? [text] : [])
  return new Set(Array.from({ length: text.length - 1 }, (_, index) => text.slice(index, index + 2)))
}

function similarity(left, right) {
  const a = clean(left)
  const b = clean(right)
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.94
  const ga = grams(a)
  const gb = grams(b)
  const intersection = [...ga].filter(value => gb.has(value)).length
  const union = new Set([...ga, ...gb]).size
  return union ? Math.min(0.9, intersection / union) : 0
}

function identity(item) {
  return [item.title, item.courseName, item.course_name, item.teacher, item.name]
    .filter(Boolean)
}

function requestedIdentity(intent) {
  return (intent.slots?.values || [])
    .filter(slot => ['query', 'title', 'course_name', 'teacher_name'].includes(slot.key))
    .map(slot => slot.value)
    .join(' ')
}

function ordinal(intent) {
  const raw = (intent.slots?.values || []).find(slot => slot.key === 'ordinal')?.value
  const value = Number(String(raw || '').match(/\d+/)?.[0] || 0)
  return Number.isInteger(value) && value > 0 ? value : 0
}

function objectType(item = {}) {
  const type = String(item.type || item.contentType || item.content_type || '')
  if (type === 'schedule') return 'schedule_item'
  if (type === 'reading') return 'reading_item'
  if (type === 'course_brief') return 'course_brief'
  if (type === 'course') return 'course'
  return ''
}

function compatible(item, intent) {
  return Boolean(item?.id && objectType(item) === intent.objectType)
}

export function resolveEntities({ intent, candidates = [], sessionState = {}, thresholds = {} }) {
  const contextualKinds = new Set([
    'deictic', 'last_created', 'last_updated', 'last_selected', 'previous_result'
  ])
  const contextual = intent.contextReferences.some(reference => contextualKinds.has(reference.kind))
    ? sessionState?.activeFocus
    : null
  if (compatible(contextual, intent)) {
    return {
      status: 'resolved', selected: contextual, candidates: [contextual],
      score: 1, gap: 1, provenance: 'active_focus'
    }
  }
  const selectedOrdinal = ordinal(intent)
  const resultSet = Array.isArray(sessionState?.resultSet) ? sessionState.resultSet : []
  if (intent.scope === 'single' && selectedOrdinal) {
    const selected = candidates[selectedOrdinal - 1]
    return selected && compatible(selected, intent)
      ? {
          status: 'resolved', selected, candidates: [selected],
          score: 1, gap: 1, provenance: 'resource_ordinal'
        }
      : {
          status: 'missing', selected: null, candidates: candidates.slice(0, 5),
          score: 0, gap: 0, provenance: 'resource_ordinal'
        }
  }
  if (intent.scope === 'selected' && selectedOrdinal) {
    const selected = resultSet[selectedOrdinal - 1]
    return selected && (intent.action === 'select' || compatible(selected, intent))
      ? { status: 'resolved', selected, candidates: [selected], score: 1, gap: 1, provenance: 'result_set' }
      : { status: 'missing', selected: null, candidates: [], score: 0, gap: 0, provenance: 'result_set' }
  }
  const query = requestedIdentity(intent)
  if (!query) {
    return intent.scope === 'list' || intent.scope === 'all_unread'
      ? { status: 'collection', selected: null, candidates, score: 1, gap: 1, provenance: 'query' }
      : { status: 'missing', selected: null, candidates: candidates.slice(0, 5), score: 0, gap: 0, provenance: 'query' }
  }
  const ranked = candidates
    .filter(item => compatible(item, intent))
    .map(item => ({ item, score: Math.max(0, ...identity(item).map(value => similarity(query, value))) }))
    .filter(entry => entry.score > 0)
    .sort((left, right) => right.score - left.score)
  const first = ranked[0]
  const second = ranked[1]
  const score = first?.score || 0
  const gap = score - (second?.score || 0)
  const minimum = Number(thresholds.autoResolveMinimum || 0.98)
  const minimumGap = Number(thresholds.candidateGapMinimum || 0.2)
  if (score >= minimum && gap >= minimumGap) {
    return {
      status: 'resolved', selected: first.item,
      candidates: ranked.slice(0, 5).map(entry => entry.item), score, gap, provenance: 'resource'
    }
  }
  return {
    status: ranked.length ? 'ambiguous' : 'missing', selected: null,
    candidates: ranked.slice(0, 5).map(entry => entry.item), score, gap, provenance: 'resource'
  }
}
