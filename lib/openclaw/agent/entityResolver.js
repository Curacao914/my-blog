import { contextCandidates } from './session'

function clean(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[《》“”"'，。！？、：；（）()[\]{}\s·._-]+/g, '')
    .trim()
}

function tokenize(value) {
  const raw = String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[《》“”"'，。！？、：；（）()[\]{}·._-]+/g, ' ')
  const tokens = raw
    .split(/\s+/)
    .flatMap(part => {
      if (!part) return []
      const datePieces = part.match(/\d{4}|\d{1,2}|[\p{Script=Han}]{2,}/gu)
      return datePieces || [part]
    })
    .map(clean)
    .filter(token => token.length >= 2)
  return [...new Set(tokens)]
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function normalizeDateFilter(value, now = new Date()) {
  const text = String(value || '').normalize('NFKC')
  const iso = text.match(/\b(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日|号)?\b/)
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`

  const short = text.match(/(?:^|\D)(\d{1,2})月(\d{1,2})(?:日|号)?/)
  if (short) {
    return `${now.getFullYear()}-${pad(short[1])}-${pad(short[2])}`
  }

  const compact = text.match(/\b(20\d{2})(\d{2})(\d{2})\b/)
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`
  return ''
}

function candidateDate(candidate = {}) {
  const direct = normalizeDateFilter(
    [
      candidate.date,
      candidate.lessonTitle,
      candidate.title,
      candidate.updatedAt
    ].filter(Boolean).join(' ')
  )
  return direct
}

function haystack(candidate = {}) {
  return clean([
    candidate.title,
    candidate.courseName,
    candidate.lessonTitle,
    candidate.teacher,
    candidate.mainLine,
    candidate.date,
    candidate.time,
    candidate.place
  ].filter(Boolean).join(' '))
}

function exactContextMatch(candidate, context) {
  return context?.id && candidate?.id === context.id
}

function scoreCandidate(candidate = {}, {
  query = '',
  filters = {},
  now = new Date()
} = {}) {
  const queryText = clean(query)
  const hay = haystack(candidate)
  let score = 0
  const reasons = []

  if (queryText && hay.includes(queryText)) {
    score += 0.58
    reasons.push('full_query')
  }

  const tokens = tokenize(query)
  if (tokens.length) {
    const matched = tokens.filter(token => hay.includes(token))
    const tokenScore = matched.length / tokens.length
    score += Math.min(0.34, tokenScore * 0.34)
    if (matched.length) reasons.push(`tokens:${matched.length}/${tokens.length}`)
  }

  const courseName = clean(filters.courseName)
  if (courseName) {
    const candidateCourse = clean(candidate.courseName || candidate.title)
    if (candidateCourse.includes(courseName) || courseName.includes(candidateCourse)) {
      score += 0.3
      reasons.push('course')
    } else {
      score -= 0.2
    }
  }

  const wantedDate =
    normalizeDateFilter(filters.lessonDate, now) ||
    normalizeDateFilter(query, now)
  if (wantedDate) {
    if (candidateDate(candidate) === wantedDate) {
      score += 0.36
      reasons.push('date')
    } else {
      score -= 0.12
    }
  }

  if (typeof filters.read === 'boolean') {
    if (Boolean(candidate.read) === filters.read) {
      score += 0.08
      reasons.push('read_state')
    } else {
      score -= 0.2
    }
  }

  return {
    ...candidate,
    score: Math.max(0, Math.min(1, score)),
    matchReason: reasons.join(',')
  }
}

function clarification(candidates = []) {
  const visible = candidates.slice(0, 4)
  if (!visible.length) {
    return '我理解了要处理的类型，但没有找到对应的真实对象。请补充标题、课程名或日期。'
  }
  const lines = visible.map((item, index) => {
    const detail = [
      item.courseName,
      item.lessonTitle,
      item.date,
      item.time
    ].filter(Boolean).join(' · ')
    return `${index + 1}. ${item.title}${detail ? `（${detail}）` : ''}`
  })
  return `我找到了几个可能的对象，请说明是哪一个：\n${lines.join('\n')}`
}

export function resolveTargets({
  plan,
  candidates = [],
  session = {},
  now = new Date()
} = {}) {
  const scope = plan.scope || 'single'
  const refs = plan.target?.contextRefs || []
  const contexts = contextCandidates(session, refs)

  if (scope === 'all_unread') {
    const matches = candidates.filter(item => !item.read)
    return {
      status: 'resolved',
      targets: matches,
      candidates: matches,
      strategy: 'all_unread'
    }
  }

  if (scope === 'all') {
    return {
      status: 'resolved',
      targets: candidates,
      candidates,
      strategy: 'all'
    }
  }

  for (const context of contexts) {
    const match = candidates.find(candidate =>
      exactContextMatch(candidate, context)
    )
    if (match) {
      return {
        status: 'resolved',
        targets: [match],
        candidates: [match],
        strategy: 'context'
      }
    }
  }

  const scored = candidates
    .map(candidate =>
      scoreCandidate(candidate, {
        query: plan.target?.query || '',
        filters: plan.target?.filters || {},
        now
      })
    )
    .sort((left, right) => right.score - left.score)

  if (scope === 'matching') {
    const matches = scored.filter(item => item.score >= 0.58)
    if (!matches.length) {
      return {
        status: 'not_found',
        targets: [],
        candidates: scored.slice(0, 4),
        replyText: clarification([]),
        strategy: 'matching'
      }
    }
    return {
      status: 'resolved',
      targets: matches,
      candidates: matches,
      strategy: 'matching'
    }
  }

  const top = scored[0]
  const second = scored[1]
  if (!top || top.score < 0.58) {
    return {
      status: 'not_found',
      targets: [],
      candidates: scored.slice(0, 4),
      replyText: clarification([]),
      strategy: 'single'
    }
  }

  if (
    second &&
    second.score >= 0.58 &&
    top.score - second.score < 0.12
  ) {
    return {
      status: 'ambiguous',
      targets: [],
      candidates: scored.slice(0, 4),
      replyText: clarification(scored),
      strategy: 'single'
    }
  }

  return {
    status: 'resolved',
    targets: [top],
    candidates: scored.slice(0, 4),
    strategy: 'single'
  }
}
