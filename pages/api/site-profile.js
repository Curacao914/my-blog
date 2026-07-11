import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { getPublicSiteProfile, savePublicSiteProfile } from '@/lib/siteProfile'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, profile: await getPublicSiteProfile() })
  }
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  try {
    const profile = await savePublicSiteProfile(auth.actorProfile?.id, req.body || {})
    return res.status(200).json({ ok: true, profile })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : '保存失败' })
  }
}
