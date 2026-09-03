const EMPTY_TEXT = new Set(['', 'none', 'null', 'undefined'])
const GENERIC_READING_TAGS = new Set(['阅读', '待读', '已读', 'reading', 'read', 'unread'])

export function cleanDisplayText(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (EMPTY_TEXT.has(text.toLowerCase())) return ''
  return text
}

export function cleanDisplayTags(values, { limit = 3, omitGenericReading = false } = {}) {
  const source = Array.isArray(values) ? values : []
  const seen = new Set()
  const tags = []

  source.forEach((value) => {
    const tag = cleanDisplayText(value)
    if (!tag) return
    if (omitGenericReading && GENERIC_READING_TAGS.has(tag)) return
    const key = tag.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    tags.push(tag)
  })

  return tags.slice(0, limit)
}

export function tagsFromItem(item = {}, options = {}) {
  return cleanDisplayTags(
    [
      ...(Array.isArray(item.tags) ? item.tags : []),
      ...(Array.isArray(item.aiTrace?.tags) ? item.aiTrace.tags : []),
      ...(Array.isArray(item.aiTrace?.labels) ? item.aiTrace.labels : []),
      ...(Array.isArray(item.metadata?.tags) ? item.metadata.tags : [])
    ],
    options
  )
}

export function readableSource(value) {
  const source = cleanDisplayText(value)
  if (!source) return ''
  if (source === 'wechat') return '微信'
  if (source === 'web') return '网页'
  return source
}

export function excerptText(value, limit = 96) {
  const text = cleanDisplayText(value).replace(/\s+/g, ' ')
  if (!text) return ''
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}
