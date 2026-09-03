function text(value = '') {
  return String(value || '').trim()
}

function add(set, value) {
  const normalized = text(value)
  if (normalized) set.add(normalized)
}

export function collectContentTaxonomy(items = []) {
  const categories = new Set()
  const collections = new Set()
  const tags = new Set()
  const collectionMap = new Map()

  ;(items || []).forEach(item => {
    const settings = item?.settings || {}
    const display = item?.display || {}
    const folderPath = settings.folderPath || item?.folder?.path || display.folder_path || []
    const category = text(settings.category || display.category || item?.category || folderPath[0])
    const collection = text(settings.collection || folderPath[1] || item?.course?.name)

    add(categories, category)
    add(collections, collection)

    if (category && collection) {
      if (!collectionMap.has(category)) collectionMap.set(category, new Set())
      collectionMap.get(category).add(collection)
    }

    const itemTags = settings.tags || display.tags || item?.tags || []
    ;(Array.isArray(itemTags) ? itemTags : [itemTags]).forEach(tag => add(tags, tag))
  })

  const sort = values => [...values].sort((left, right) => left.localeCompare(right, 'zh-CN'))
  const collectionsByCategory = Object.fromEntries(
    [...collectionMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
      .map(([category, values]) => [category, sort(values)])
  )

  return {
    categories: sort(categories),
    collections: sort(collections),
    collectionsByCategory,
    tags: sort(tags)
  }
}
