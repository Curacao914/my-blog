export const READING_ARCHIVE_VIEW = '__reading_archive__'

export const DEFAULT_READING_FOLDERS = Object.freeze([
  {
    systemKey: 'course-briefs',
    title: '课程简报',
    description: '按课程和课次整理自动生成的简报。',
    icon: '课'
  },
  {
    systemKey: 'public-articles',
    title: '公众号文章',
    description: '来自微信公众号及公开文章链接的阅读材料。',
    icon: '文'
  },
  {
    systemKey: 'other-reading',
    title: '其他内容',
    description: '书目、网页、长文与不属于固定来源的材料。',
    icon: '读'
  },
  {
    systemKey: 'reading-inbox',
    title: '未分类',
    description: '历史文章和尚未手动归类的阅读内容。',
    icon: '收'
  }
])

export function isReadingFolder(item = {}) {
  return (
    item?.aiTrace?.entityType === 'reading-folder' ||
    item?.ai_trace?.entityType === 'reading-folder'
  )
}

export function isReadingItem(item = {}) {
  if (isReadingFolder(item)) return false
  return (
    item.contentType === 'reading' ||
    item.content_type === 'reading' ||
    item.aiTrace?.contentType === 'reading' ||
    item.ai_trace?.contentType === 'reading' ||
    item.section === '阅读' ||
    item.sectionKey === 'reading' ||
    item.section_key === 'reading' ||
    item.date === 'reading'
  )
}

export function readingTrace(item = {}) {
  return item.aiTrace || item.ai_trace || {}
}

export function folderName(folder = {}) {
  const trace = readingTrace(folder)
  const preset = DEFAULT_READING_FOLDERS.find(
    item => item.systemKey === trace.systemKey
  )
  return (
    preset?.title ||
    trace.folderName ||
    folder.title ||
    '未命名文件夹'
  )
}

export function folderParentId(folder = {}) {
  return String(readingTrace(folder).parentFolderId || '')
}

export function folderSystemKey(folder = {}) {
  return String(readingTrace(folder).systemKey || '')
}

export function folderIcon(folder = {}) {
  const trace = readingTrace(folder)
  if (trace.icon) return String(trace.icon).slice(0, 2)
  const preset = DEFAULT_READING_FOLDERS.find(
    item => item.systemKey === trace.systemKey
  )
  return preset?.icon || '夹'
}

export function buildDefaultFolderDrafts(items = []) {
  const existingKeys = new Set(
    items.filter(isReadingFolder).map(folderSystemKey).filter(Boolean)
  )
  return DEFAULT_READING_FOLDERS
    .filter(folder => !existingKeys.has(folder.systemKey))
    .map(folder => ({
      title: folder.title,
      section: '阅读',
      sectionKey: 'reading',
      contentType: 'reading',
      date: 'reading',
      status: 'active',
      source: 'reading-library',
      summary: folder.description,
      links: [],
      children: [],
      note: '',
      aiTrace: {
        entityType: 'reading-folder',
        contentType: 'reading',
        folderName: folder.title,
        parentFolderId: '',
        systemKey: folder.systemKey,
        icon: folder.icon,
        protected: true,
        createdBy: 'system-default'
      }
    }))
}

function linkHost(item = {}) {
  const links = Array.isArray(item.links) ? item.links : []
  for (const link of links) {
    try {
      const host = new URL(link?.url || '').host
      if (host) return host
    } catch {}
  }
  return ''
}

export function readingKind(item = {}) {
  const trace = readingTrace(item)
  if (trace.readingKind) return String(trace.readingKind)
  if (trace.courseBriefKey || trace.courseJobId || trace.lessonKey) {
    return 'course-brief'
  }
  const source = String(item.source || trace.source || '').toLowerCase()
  const host = linkHost(item).toLowerCase()
  if (
    source.includes('wechat') ||
    source.includes('weixin') ||
    host === 'mp.weixin.qq.com'
  ) {
    return 'public-article'
  }
  return 'other'
}

export function systemFolderKeyForItem(item = {}) {
  const kind = readingKind(item)
  if (kind === 'course-brief') return 'course-briefs'
  if (kind === 'public-article') return 'public-articles'
  if (kind === 'other') {
    const hasUsefulSource = Boolean(
      String(item.source || '').trim() ||
      (item.links || []).length
    )
    return hasUsefulSource ? 'other-reading' : 'reading-inbox'
  }
  return 'reading-inbox'
}

export function findSystemFolder(folders = [], systemKey = '') {
  return folders.find(folder => folderSystemKey(folder) === systemKey) || null
}

export function effectiveFolderId(item = {}, folders = []) {
  const explicit = String(readingTrace(item).folderId || '')
  if (explicit && folders.some(folder => folder.id === explicit)) {
    return explicit
  }
  const fallback = findSystemFolder(
    folders,
    systemFolderKeyForItem(item)
  )
  return fallback?.id || ''
}

export function migrateLegacyReadingItems(items = []) {
  const folders = items.filter(isReadingFolder)
  const unclassified = findSystemFolder(
    folders,
    'reading-inbox'
  )
  if (!unclassified?.id) {
    return { items, changed: false }
  }

  let changed = false
  const nextItems = items.map(item => {
    if (!isReadingItem(item) || !item.id) return item
    const trace = readingTrace(item)
    if (String(trace.folderId || '')) return item

    changed = true
    return patchReadingTrace(item, {
      folderId: unclassified.id,
      folderMigration: 'legacy-unclassified-v1'
    })
  })

  return { items: nextItems, changed }
}

export function descendantFolderIds(folders = [], folderId = '') {
  const found = new Set()
  const visit = id => {
    folders
      .filter(folder => folderParentId(folder) === id)
      .forEach(folder => {
        if (!folder.id || found.has(folder.id)) return
        found.add(folder.id)
        visit(folder.id)
      })
  }
  visit(folderId)
  return found
}

export function folderBreadcrumbs(folders = [], folderId = '') {
  const byId = new Map(folders.map(folder => [folder.id, folder]))
  const result = []
  const seen = new Set()
  let current = byId.get(folderId)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    result.unshift(current)
    current = byId.get(folderParentId(current))
  }
  return result
}

export function sortReadingFolders(folders = []) {
  return [...folders].sort((left, right) => {
    const leftSystem = folderSystemKey(left) ? 0 : 1
    const rightSystem = folderSystemKey(right) ? 0 : 1
    return (
      leftSystem - rightSystem ||
      Number(readingTrace(left).order || 0) -
        Number(readingTrace(right).order || 0) ||
      folderName(left).localeCompare(folderName(right), 'zh-CN')
    )
  })
}

export function readingItemTitle(item = {}) {
  const trace = readingTrace(item)
  if (trace.readingKind === 'course-brief' && trace.courseName) {
    const lesson = trace.lessonTitle || item.title || '未命名课次'
    return `${trace.courseName}｜${lesson}`
  }
  return item.title || '未命名阅读'
}

export function readingBody(item = {}) {
  const trace = readingTrace(item)
  return String(
    trace.bodyMarkdown ||
    trace.markdown ||
    item.bodyMarkdown ||
    item.summary ||
    ''
  )
}

export function patchReadingTrace(item = {}, patch = {}) {
  return {
    ...item,
    aiTrace: {
      ...readingTrace(item),
      ...patch
    }
  }
}

export function folderDraft(title, parentFolderId = '') {
  return {
    title,
    section: '阅读',
    sectionKey: 'reading',
    contentType: 'reading',
    date: 'reading',
    status: 'active',
    source: 'reading-library',
    summary: '',
    links: [],
    children: [],
    note: '',
    aiTrace: {
      entityType: 'reading-folder',
      contentType: 'reading',
      folderName: title,
      parentFolderId,
      systemKey: '',
      icon: '夹',
      protected: false,
      createdBy: 'user'
    }
  }
}
