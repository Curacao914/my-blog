function dateValue(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function hrefFor(page = {}) {
  if (page.href) return page.href
  const slug = String(page.slug || '').replace(/^\/+/, '')
  return slug ? `/${slug}` : '/'
}

export function normalizeNotionContentIndex(allPages = []) {
  return (allPages || [])
    .filter(page => page?.type === 'Post' && page?.status === 'Published' && page?.slug)
    .map(page => {
      const category = page.category || '文章'
      const tags = Array.isArray(page.tags) ? page.tags.filter(Boolean) : []
      const updatedAt = dateValue(page.lastEditedDate || page.publishDate)
      const publishedAt = dateValue(page.publishDate) || updatedAt

      return {
        id: `notion:${page.id || page.slug}`,
        slug: page.slug,
        href: hrefFor(page),
        title: page.title || '未命名内容',
        type: 'article',
        status: 'published',
        summary: page.summary || '',
        source: 'notion',
        sourceId: page.id || page.slug,
        updatedAt,
        date: publishedAt,
        tags,
        category,
        access: {
          mode: 'public',
          allowIndexing: true,
          allowRss: true,
          allowSitemap: true
        },
        display: {
          category,
          tags,
          pinned: Boolean(page.ext?.pinned),
          showInRecent: true
        },
        folder: { path: [category] },
        cover: page.pageCoverThumbnail || '',
        icon: page.pageIcon || '',
        legacyNotion: true
      }
    })
}
