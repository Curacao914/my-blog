import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import {
  listManagedContent,
  withdrawManagedContent
} from '@/lib/contentManagement'

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    if (req.method === 'GET') {
      const items = await listManagedContent()
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({ ok: true, items })
    }

    if (req.method === 'PATCH') {
      const action = String(req.body?.action || '')
      if (action !== 'withdraw') throw new Error('Unsupported content action')
      const item = await withdrawManagedContent(String(req.body?.itemId || ''))
      try {
        await res.revalidate('/content')
        if (item.slug) await res.revalidate(`/content/${item.slug}`)
      } catch (error) {
        console.warn('[content manage] revalidate failed', error)
      }
      return res.status(200).json({ ok: true, item })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Content management failed'
    })
  }
}
