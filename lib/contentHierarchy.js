export function contentFolderPath(item = {}) {
  const existing = item?.folder?.path || item?.display?.folder_path || []
  if (Array.isArray(existing) && existing.filter(Boolean).length) {
    return existing.map(value => String(value || '').trim()).filter(Boolean)
  }

  const category = item?.display?.category || item?.category || '未归档'
  const collection = item?.course?.name || ''
  return [category, collection].filter(Boolean)
}

export function mergeContentIndexes(liveItems = [], databaseItems = []) {
  const merged = new Map()
  ;(liveItems || []).forEach(item => {
    if (item?.slug) merged.set(item.slug, item)
  })
  ;(databaseItems || []).forEach(item => {
    if (item?.slug) merged.set(item.slug, item)
  })
  return [...merged.values()].sort((left, right) => {
    const leftTime = Date.parse(left?.date || left?.updatedAt || 0)
    const rightTime = Date.parse(right?.date || right?.updatedAt || 0)
    return rightTime - leftTime
  })
}

export function mergeContentPaths(livePaths = [], databaseItems = []) {
  const paths = new Map()
  ;(livePaths || []).forEach(item => {
    const slug = item?.params?.slug
    const key = Array.isArray(slug) ? slug.join('/') : String(slug || '')
    if (key) paths.set(key, item)
  })
  ;(databaseItems || []).forEach(item => {
    if (!item?.slug) return
    paths.set(item.slug, { params: { slug: item.slug.split('/') } })
  })
  return [...paths.values()]
}

export function groupContentByCollection(items = []) {
  const groups = new Map()

  ;(items || []).forEach(item => {
    const path = contentFolderPath(item)
    const category = path[0] || '未归档'
    const collection = path[1] || ''
    const key = `${category}::${collection}`

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        category,
        collection,
        path: [category, collection].filter(Boolean),
        items: []
      })
    }
    groups.get(key).items.push(item)
  })

  return [...groups.values()]
}
