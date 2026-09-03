const typeLabels = {
  article: '文章',
  'course-note': '课程笔记',
  'reading-note': '读书记录',
  project: '项目',
  page: '页面'
}

export function publicContentTypeLabel(value = '') {
  return typeLabels[value] || String(value || '内容')
}

export function publicContentCategory(item = {}) {
  return String(
    item?.display?.category ||
    item?.category ||
    item?.folder?.path?.[0] ||
    '未归档'
  )
}

export function publicContentCollection(item = {}) {
  return String(
    item?.collection ||
    item?.folder?.path?.[1] ||
    item?.course?.name ||
    '文章'
  )
}

export function publicContentTags(item = {}) {
  const tags = item?.display?.tags || item?.tags || []
  return Array.isArray(tags) ? tags.filter(Boolean) : []
}

export function publicContentHref(item = {}) {
  if (item?.href) return item.href
  return item?.slug ? `/content/${item.slug}` : '/content'
}

export function publicContentDate(item = {}) {
  return item?.date || item?.updatedAt || item?.publishDate || null
}

export function publicContentTimestamp(item = {}) {
  const value = Date.parse(publicContentDate(item) || 0)
  return Number.isFinite(value) ? value : 0
}

export function publicContentSourceLabel(item = {}) {
  if (item?.source === 'notion') return 'Notion'
  if (item?.source === 'course-worker' || item?.source === 'course-workflow') return '课程工作台'
  return '站内内容'
}

export function publicContentStableHue(value = '') {
  let hash = 0
  for (const char of String(value || '')) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  }
  return Math.abs(hash) % 48 + 148
}

export function publicContentSearchText(item = {}) {
  return [
    item?.title,
    item?.summary,
    publicContentCategory(item),
    publicContentCollection(item),
    item?.course?.name,
    item?.course?.lesson,
    item?.course?.teacher,
    ...publicContentTags(item)
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('zh-CN')
}

export function filterPublicContent(items = [], filters = {}) {
  const query = String(filters.query || '').trim().toLocaleLowerCase('zh-CN')
  const category = String(filters.category || '全部')
  const type = String(filters.type || '全部')
  const tag = String(filters.tag || '')

  return (items || []).filter(item => {
    if (query && !publicContentSearchText(item).includes(query)) return false
    if (category !== '全部' && publicContentCategory(item) !== category) return false
    if (type !== '全部' && item?.type !== type) return false
    if (tag && !publicContentTags(item).includes(tag)) return false
    return true
  })
}

export function sortPublicContent(items = []) {
  return [...(items || [])].sort((left, right) => {
    const pinnedDifference = Number(Boolean(right?.display?.pinned)) - Number(Boolean(left?.display?.pinned))
    if (pinnedDifference) return pinnedDifference
    return publicContentTimestamp(right) - publicContentTimestamp(left)
  })
}

export function selectRecentPublicContent(items = [], limit = 6) {
  return sortPublicContent(
    (items || []).filter(item => item?.display?.showInRecent !== false)
  ).slice(0, limit)
}

export function selectRssPublicContent(items = [], limit = 30) {
  return sortPublicContent(
    (items || []).filter(item =>
      item?.access?.mode === 'public' && item?.access?.allowRss === true
    )
  ).slice(0, limit)
}

export function selectSitemapPublicContent(items = []) {
  return sortPublicContent(
    (items || []).filter(item =>
      item?.access?.mode === 'public' &&
      item?.access?.allowSitemap === true &&
      item?.access?.allowIndexing !== false
    )
  )
}
