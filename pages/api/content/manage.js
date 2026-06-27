import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { getLiveContentIndex } from '@/lib/contentSnapshots'
import { normalizeNotionContentIndex } from '@/lib/content/notionIndex'
import { collectContentTaxonomy } from '@/lib/content/taxonomy'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import {
  listManagedContent,
  withdrawManagedContent
} from '@/lib/contentManagement'

const NOTION_TAXONOMY_TTL_MS = 10 * 60 * 1000
let notionTaxonomyCache = { expiresAt: 0, items: [] }

async function getNotionTaxonomyItems() {
  if (notionTaxonomyCache.expiresAt > Date.now()) return notionTaxonomyCache.items

  const notionData = await fetchGlobalAllData({ from: 'content-manage-taxonomy' })
  const items = normalizeNotionContentIndex(notionData?.allPages || [])
  notionTaxonomyCache = {
    expiresAt: Date.now() + NOTION_TAXONOMY_TTL_MS,
    items
  }
  return items
}

export default async function handler(req, res) {
  const auth = await requireAdminRequest(req)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    if (req.method === 'GET') {
      const [items, notionItems] = await Promise.all([
        listManagedContent(),
        getNotionTaxonomyItems().catch(error => {
          console.warn('[content manage] Notion taxonomy read failed', error)
          return notionTaxonomyCache.items
        })
      ])
      const taxonomy = collectContentTaxonomy([
        ...notionItems,
        ...getLiveContentIndex(),
        ...items
      ])
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({ ok: true, items, taxonomy })
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
