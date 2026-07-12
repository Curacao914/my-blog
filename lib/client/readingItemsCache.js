const memory = new Map()
const inflight = new Map()
const generations = new Map()

function generation(profileId) {
  return generations.get(profileId) || 0
}

function invalidate(profileId) {
  generations.set(profileId, generation(profileId) + 1)
}

export function readingItemsStorageKey(profileId = '') {
  return `law-tech.reading.v1:${profileId || 'unknown'}`
}

export function readReadingItemsCache(profileId) {
  if (!profileId || typeof window === 'undefined') return null
  if (memory.has(profileId)) return memory.get(profileId)

  try {
    const raw = window.localStorage.getItem(readingItemsStorageKey(profileId))
    if (raw === null) return null
    const items = JSON.parse(raw)
    const normalized = Array.isArray(items) ? items : []
    memory.set(profileId, normalized)
    return normalized
  } catch {
    return null
  }
}

export function writeReadingItemsCache(profileId, items = []) {
  if (!profileId || typeof window === 'undefined') return
  const normalized = Array.isArray(items) ? items : []
  memory.set(profileId, normalized)
  try {
    window.localStorage.setItem(
      readingItemsStorageKey(profileId),
      JSON.stringify(normalized)
    )
  } catch {}
}

export async function fetchReadingItems(profileId, { force = false } = {}) {
  if (!profileId) throw new Error('missing profile id')
  if (!force) {
    const cached = readReadingItemsCache(profileId)
    if (cached !== null) return cached
  }
  if (inflight.has(profileId)) return inflight.get(profileId)

  const requestGeneration = generation(profileId)
  let request
  request = fetch('/api/reading/items', {
    credentials: 'same-origin',
    cache: 'no-store'
  })
    .then(async response => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || '阅读资料读取失败')
      }
      const items = Array.isArray(data.items) ? data.items : []
      if (generation(profileId) === requestGeneration) {
        writeReadingItemsCache(profileId, items)
      }
      return items
    })
    .finally(() => {
      if (inflight.get(profileId) === request) {
        inflight.delete(profileId)
      }
    })

  inflight.set(profileId, request)
  return request
}

export function clearReadingItemsCache(profileId = '') {
  if (profileId) {
    invalidate(profileId)
    memory.delete(profileId)
    inflight.delete(profileId)
    return
  }

  const profileIds = new Set([
    ...memory.keys(),
    ...inflight.keys(),
    ...generations.keys()
  ])
  profileIds.forEach(invalidate)
  memory.clear()
  inflight.clear()
}
