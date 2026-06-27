export function publicContentRevalidationPaths(slug = '') {
  const paths = new Set(['/', '/content', '/search', '/archive', '/category', '/tag'])
  const normalizedSlug = String(slug || '').replace(/^\/+/, '')
  if (normalizedSlug) paths.add(`/content/${normalizedSlug}`)
  return [...paths]
}

export async function revalidatePublicContentSurfaces(res, slug = '', label = 'content') {
  const revalidated = []
  const failed = []

  for (const path of publicContentRevalidationPaths(slug)) {
    try {
      await res.revalidate(path)
      revalidated.push(path)
    } catch (error) {
      failed.push({
        path,
        error: error instanceof Error ? error.message : 'revalidate failed'
      })
    }
  }

  if (failed.length) {
    console.warn(`[${label}] public revalidate partially failed`, failed)
  }

  return { revalidated, failed }
}
