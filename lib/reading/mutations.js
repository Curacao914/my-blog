function normalizedItems(value) {
  return Array.isArray(value) ? value : []
}

function comparable(item = {}) {
  const copy = { ...item }
  delete copy.createdAt
  delete copy.updatedAt
  return copy
}

function sameItem(left, right) {
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right))
}

export function buildReadingMutation(currentItems = [], nextItems = [], explicitDeletedIds = []) {
  const current = normalizedItems(currentItems)
  const next = normalizedItems(nextItems)
  const currentById = new Map(
    current.filter(item => item?.id).map(item => [item.id, item])
  )
  const nextIds = new Set(next.map(item => item?.id).filter(Boolean))
  const deletedIds = new Set(
    normalizedItems(explicitDeletedIds).filter(id => /^[0-9a-f-]{36}$/i.test(String(id || '')))
  )

  current.forEach(item => {
    if (item?.id && !nextIds.has(item.id)) deletedIds.add(item.id)
  })

  const upserts = next.filter(item => {
    if (!item?.id) return true
    if (deletedIds.has(item.id)) return false
    const previous = currentById.get(item.id)
    return !previous || !sameItem(previous, item)
  })

  return {
    upserts,
    deletedIds: [...deletedIds]
  }
}
