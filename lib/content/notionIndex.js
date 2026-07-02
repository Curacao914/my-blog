function dateValue(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cleanSlug(value = '') {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '')
}

function fallbackSlug(page = {}) {
  const explicit = cleanSlug(page.slug)
  if (explicit) return explicit

  const stableId = String(page.id || page.short_id || '')
    .trim()
    .replace(/-/g, '')

  return stableId
}

function hrefFor(page = {}, slug = fallbackSlug(page)) {
  if (page.href) return page.href
  return slug ? `/${slug}` : '/'
}

function notionCollection(page = {}) {
  return String(
    page.collection ||
    page.ext?.collection ||
    page.ext?.合集 ||
    '文章'
  ).trim()
}

function isPasswordProtected(page = {}) {
  return Boolean(String(page.password || '').trim())
}

export function normalizeNotionContentIndex(allPages = []) {
  return (allPages || [])
    .filter(page =>
      page?.type === 'Post' &&
      page?.status === 'Published' &&
      (page?.slug || page?.id)
    )
    .map(page => {
      const slug = fallbackSlug(page)
      const category = page.category || '文章'
      const collection = notionCollection(page)
      const tags = Array.isArray(page.tags) ? page.tags.filter(Boolean) : []
      const updatedAt = dateValue(page.lastEditedDate || page.publishDate)
      const publishedAt = dateValue(page.publishDate) || updatedAt
      const passwordProtected = isPasswordProtected(page)

      return {
        id: `notion:${page.id || slug}`,
        slug,
        href: hrefFor(page, slug),
        title: page.title || '未命名内容',
        type: 'article',
        status: 'published',
        summary: page.summary || '',
        source: 'notion',
        sourceId: page.id || slug,
        updatedAt,
        date: publishedAt,
        tags,
        category,
        collection,
        access: {
          mode: passwordProtected ? 'password' : 'public',
          allowIndexing: !passwordProtected,
          allowRss: !passwordProtected,
          allowSitemap: !passwordProtected
        },
        display: {
          category,
          tags,
          pinned: Boolean(page.ext?.pinned),
          showInRecent: true
        },
        folder: { path: [category, collection] },
        cover: page.pageCoverThumbnail || '',
        icon: page.pageIcon || '',
        legacyNotion: true,
        generatedSlug: Boolean(page.slugGenerated) || !cleanSlug(page.slug)
      }
    })
}
