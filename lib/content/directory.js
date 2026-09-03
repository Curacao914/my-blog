import {
  publicContentCategory,
  publicContentDate,
  publicContentTags,
  sortPublicContent
} from '@/lib/content/publicContent'

const preferredCategoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']

function recent(items = [], limit = 6) {
  return sortPublicContent(items).slice(0, limit)
}

function categoryOrder(label) {
  const index = preferredCategoryOrder.indexOf(label)
  return index < 0 ? Number.MAX_SAFE_INTEGER : index
}

export function categoryDirectory(items = []) {
  const groups = new Map(preferredCategoryOrder.map(label => [label, []]))
  ;(items || []).forEach(item => {
    const label = publicContentCategory(item)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(item)
  })
  return [...groups.entries()]
    .map(([label, entries]) => ({
      key: label,
      label,
      count: entries.length,
      href: `/category/${encodeURIComponent(label)}`,
      items: recent(entries, 6)
    }))
    .sort((a, b) => categoryOrder(a.label) - categoryOrder(b.label) || a.label.localeCompare(b.label, 'zh-CN'))
}

export function tagDirectory(items = []) {
  const groups = new Map()
  ;(items || []).forEach(item => {
    publicContentTags(item).forEach(label => {
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(item)
    })
  })
  return [...groups.entries()]
    .map(([label, entries]) => ({
      key: label,
      label,
      count: entries.length,
      href: `/tag/${encodeURIComponent(label)}`,
      items: recent(entries, 6)
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-CN'))
}

export function archiveDirectory(items = []) {
  const groups = new Map()
  ;(items || []).forEach(item => {
    const date = new Date(publicContentDate(item) || 0)
    const label = Number.isNaN(date.getTime()) ? '未标注日期' : String(date.getFullYear())
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(item)
  })
  return [...groups.entries()]
    .map(([label, entries]) => ({
      key: label,
      label,
      kicker: 'Year',
      count: entries.length,
      items: sortPublicContent(entries)
    }))
    .sort((a, b) => b.label.localeCompare(a.label, 'zh-CN'))
}
