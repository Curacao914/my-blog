import { searchAlgoliaContent } from '@/lib/content/algoliaSearch'

function clean(value, limit = 160) {
  return String(value || '').trim().slice(0, limit)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const query = clean(req.query.q || req.query.query)
  if (!query) return res.status(200).json({ ok: true, available: false, hits: [], total: 0 })
  try {
    const result = await searchAlgoliaContent({
      query,
      category: clean(req.query.category, 80),
      type: clean(req.query.type, 40),
      page: Number(req.query.page || 0),
      hitsPerPage: Number(req.query.hitsPerPage || 24)
    })
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.warn('[public-search] Algolia failed; client will keep local results', error)
    return res.status(200).json({ ok: true, available: false, hits: [], total: 0 })
  }
}
