const memory = new Map()
const inflight = new Map()
const generations = new Map()

function generation(profileId) {
  return generations.get(profileId) || 0
}

function invalidate(profileId) {
  generations.set(profileId, generation(profileId) + 1)
}

export function scheduleItemsStorageKey(profileId = '') {
  return `law-tech.schedule.v3:${profileId || 'unknown'}`
}

export function readScheduleItemsCache(profileId) {
  if (!profileId || typeof window === 'undefined') return null
  if (memory.has(profileId)) return memory.get(profileId)

  try {
    const raw = window.localStorage.getItem(scheduleItemsStorageKey(profileId))
    if (raw === null) return null
    const items = JSON.parse(raw)
    const normalized = Array.isArray(items) ? items : []
    memory.set(profileId, normalized)
    return normalized
  } catch {
    return null
  }
}

export function writeScheduleItemsCache(profileId, items = []) {
  if (!profileId || typeof window === 'undefined') return
  const normalized = Array.isArray(items) ? items : []
  memory.set(profileId, normalized)
  try {
    window.localStorage.setItem(
      scheduleItemsStorageKey(profileId),
      JSON.stringify(normalized)
    )
  } catch {}
}

export async function fetchScheduleItems(profileId, { force = false } = {}) {
  if (!profileId) throw new Error('missing profile id')
  if (!force) {
    const cached = readScheduleItemsCache(profileId)
    if (cached !== null) return cached
  }
  if (inflight.has(profileId)) return inflight.get(profileId)

  const requestGeneration = generation(profileId)
  let request
  request = fetch('/api/schedule/items', {
    credentials: 'same-origin',
    cache: 'no-store'
  })
    .then(async response => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || '日程读取失败')
      }
      const items = Array.isArray(data.items) ? data.items : []
      if (generation(profileId) === requestGeneration) {
        writeScheduleItemsCache(profileId, items)
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

export function clearScheduleItemsCache(profileId = '') {
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
