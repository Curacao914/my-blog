import { requireAdminRequest } from '@/lib/auth/serverAdmin'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, admin: false, error: 'Method not allowed' })
  }
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, admin: false })
  return res.status(200).json({ ok: true, admin: true })
}
