import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { getLiveContentIndex } from '@/lib/contentSnapshots'
import { collectContentTaxonomy } from '@/lib/content/taxonomy'
import { getCachedNotionTaxonomyItems, getNotionTaxonomyItems } from '@/lib/content/notionTaxonomy'
import { removeAlgoliaContent } from '@/lib/content/algoliaSearch'
import { revalidatePublicContentSurfaces } from '@/lib/content/revalidation'
import { listManagedContent, withdrawManagedContent } from '@/lib/contentManagement'

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'writing' })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  try {
    if (req.method === 'GET') {
      const [items, notionItems] = await Promise.all([
        listManagedContent(auth.profile.id),
        getNotionTaxonomyItems().catch(error => {
          console.warn('[content manage] Notion taxonomy read failed', error)
          return getCachedNotionTaxonomyItems()
        })
      ])
      const taxonomy = collectContentTaxonomy([...notionItems, ...getLiveContentIndex(), ...items])
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({ ok: true, items, taxonomy, canPublish: Boolean(auth.publicProfile?.permissions?.publish || auth.profile.role === 'owner') })
    }

    if (req.method === 'PATCH') {
      if (!auth.publicProfile?.permissions?.publish && auth.profile.role !== 'owner') {
        return res.status(403).json({ ok: false, error: '没有公开发布权限' })
      }
      const action = String(req.body?.action || '')
      if (action !== 'withdraw') throw new Error('Unsupported content action')
      const item = await withdrawManagedContent(auth.profile.id, String(req.body?.itemId || ''))
      await removeAlgoliaContent(item).catch(error => console.warn('[content manage] Algolia remove failed', error))
      await revalidatePublicContentSurfaces(res, item.slug, 'content manage')
      return res.status(200).json({ ok: true, item })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'Content management failed' })
  }
}
