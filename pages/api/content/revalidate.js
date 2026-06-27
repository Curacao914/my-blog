import { requireAdminRequest } from '@/lib/auth/serverAdmin'

function cleanPath(value) {
  const raw = String(value || '').split('#')[0].split('?')[0].trim()
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.length > 500) return ''
  return raw.replace(/\/{2,}/g, '/') || '/'
}

function relatedPaths(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  const locale = /^[a-z]{2}(?:-[A-Z]{2})?$/.test(segments[0] || '') ? `/${segments[0]}` : ''
  const paths = new Set([pathname, locale || '/', `${locale}/archive` || '/archive', `${locale}/sitemap.xml` || '/sitemap.xml'])
  if (segments.includes('article') || segments.includes('category') || segments.includes('tag')) paths.add(locale || '/')
  return [...paths].filter(Boolean)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  const pathname = cleanPath(req.body?.path)
  if (!pathname) return res.status(400).json({ ok: false, error: 'Invalid path' })
  const revalidated = []
  const failed = []
  for (const path of relatedPaths(pathname)) {
    try { await res.revalidate(path); revalidated.push(path) } catch (error) {
      failed.push({ path, error: error instanceof Error ? error.message : 'revalidate failed' })
    }
  }
  return res.status(failed.length === revalidated.length ? 500 : 200).json({ ok: failed.length === 0, revalidated, failed })
}
