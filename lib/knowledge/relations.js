function text(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('zh-CN') : ''
}

function titleTokens(value) {
  const normalized = text(value).replace(/[^\p{L}\p{N}]+/gu, ' ')
  const tokens = new Set(normalized.split(/\s+/).filter(token => token.length > 1))
  const compact = normalized.replace(/\s+/g, '')
  for (let index = 0; index < compact.length - 1; index += 1) {
    tokens.add(compact.slice(index, index + 2))
  }
  return tokens
}

function sharedValues(left = [], right = []) {
  const rightSet = new Set(right.map(text).filter(Boolean))
  return [...new Set(left.map(item => String(item || '').trim()).filter(Boolean))]
    .filter(item => rightSet.has(text(item)))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function scoreKnowledgeRelation(source = {}, target = {}) {
  if (!source?.id || !target?.id || source.id === target.id) {
    return { score: 0, reasons: [] }
  }

  const reasons = []
  let score = 0
  const sharedTags = sharedValues(source.tags, target.tags)
  if (sharedTags.length) {
    score += Math.min(.45, sharedTags.length * .18)
    reasons.push(`共同标签：${sharedTags.join('、')}`)
  }
  if (text(source.domain) && text(source.domain) === text(target.domain)) {
    score += .3
    reasons.push('同领域')
  }
  if (text(source.topic) && text(source.topic) === text(target.topic)) {
    score += .15
    reasons.push('同专题')
  }

  const sourceTokens = titleTokens(`${source.title || ''} ${source.topic || ''}`)
  const targetTokens = titleTokens(`${target.title || ''} ${target.topic || ''}`)
  const overlap = [...sourceTokens].filter(token => targetTokens.has(token)).length
  if (overlap) {
    score += Math.min(.2, overlap * .04)
    reasons.push('标题线索相近')
  }
  return { score: Math.min(1, Number(score.toFixed(3))), reasons }
}

export function suggestKnowledgeRelations(source, candidates = [], options = {}) {
  const limit = Math.max(1, Math.min(12, Number(options.limit) || 6))
  return candidates
    .filter(target => target?.id && target.id !== source?.id && target.state !== 'archived')
    .map(target => {
      const result = scoreKnowledgeRelation(source, target)
      return {
        targetId: target.id,
        targetType: 'knowledge',
        relationType: 'related',
        score: result.score,
        reasons: result.reasons
      }
    })
    .filter(item => item.score >= .18)
    .sort((left, right) => right.score - left.score || left.targetId.localeCompare(right.targetId))
    .slice(0, limit)
}
