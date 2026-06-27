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

  ;(items || []).forEach(item => {
    const settings = item?.settings || {}
    const display = item?.display || {}
    const folderPath = settings.folderPath || item?.folder?.path || display.folder_path || []

    add(categories, settings.category || display.category || item?.category || folderPath[0])
    add(collections, settings.collection || folderPath[1] || item?.course?.name)

    const itemTags = settings.tags || display.tags || item?.tags || []
    ;(Array.isArray(itemTags) ? itemTags : [itemTags]).forEach(tag => add(tags, tag))
  })

  const sort = values => [...values].sort((left, right) => left.localeCompare(right, 'zh-CN'))
  return {
    categories: sort(categories),
    collections: sort(collections),
    tags: sort(tags)
  }
}
