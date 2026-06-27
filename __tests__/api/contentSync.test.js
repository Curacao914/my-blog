import handler from '@/pages/api/content/sync'

import { requireAdminRequest } from '@/lib/auth/serverAdmin'
import { delCacheData } from '@/lib/cache/cache_manager'
import { syncAlgoliaContent } from '@/lib/content/algoliaSearch'
import { clearPublicContentIndexCache, loadPublicContentIndex } from '@/lib/content/publicIndex'
import { clearNotionTaxonomyCache } from '@/lib/content/notionTaxonomy'
import { enrichNotionSearchBodies } from '@/lib/content/notionSearch'

jest.mock('@/blog.config', () => ({ NOTION_PAGE_ID: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }))
jest.mock('@/lib/auth/serverAdmin', () => ({ requireAdminRequest: jest.fn() }))
jest.mock('@/lib/cache/cache_manager', () => ({ delCacheData: jest.fn(async () => {}) }))
jest.mock('@/lib/content/algoliaSearch', () => ({ syncAlgoliaContent: jest.fn() }))
jest.mock('@/lib/content/publicIndex', () => ({
  clearPublicContentIndexCache: jest.fn(),
  loadPublicContentIndex: jest.fn()
}))
jest.mock('@/lib/content/notionTaxonomy', () => ({ clearNotionTaxonomyCache: jest.fn() }))
jest.mock('@/lib/content/notionSearch', () => ({ enrichNotionSearchBodies: jest.fn() }))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    revalidate: jest.fn(async () => {}),
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

const item = {
  id: 'content-1',
  title: '课程笔记',
  category: '遇事不决',
  tags: ['公法'],
  access: { mode: 'public', allowIndexing: true }
}

describe('/api/content/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    loadPublicContentIndex.mockResolvedValue({ items: [item], source: 'notion+database' })
    enrichNotionSearchBodies.mockResolvedValue({ items: [item], total: 1, enriched: 1, failed: 0 })
    syncAlgoliaContent.mockResolvedValue({ available: true, synced: 1 })
  })

  it('fails closed before touching content for a non-admin request', async () => {
    requireAdminRequest.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const res = createRes()
    await handler({ method: 'POST', body: { path: '/content' } }, res)

    expect(res.statusCode).toBe(401)
    expect(loadPublicContentIndex).not.toHaveBeenCalled()
    expect(res.revalidate).not.toHaveBeenCalled()
  })

  it('refreshes Notion, full-text search and public discovery surfaces together', async () => {
    requireAdminRequest.mockResolvedValue({ ok: true, userId: 'admin-1' })
    const res = createRes()
    await handler({ method: 'POST', body: { path: '/zh-CN/content?from=header' } }, res)

    expect(res.statusCode).toBe(200)
    expect(delCacheData).toHaveBeenCalled()
    expect(clearPublicContentIndexCache).toHaveBeenCalled()
    expect(clearNotionTaxonomyCache).toHaveBeenCalled()
    expect(loadPublicContentIndex).toHaveBeenCalledWith(expect.objectContaining({ bypassCache: true, includeBody: true }))
    expect(enrichNotionSearchBodies).toHaveBeenCalled()
    expect(syncAlgoliaContent).toHaveBeenCalledWith([item], { pruneNotion: true })
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN/content')
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN/category/%E9%81%87%E4%BA%8B%E4%B8%8D%E5%86%B3')
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN/tag/%E5%85%AC%E6%B3%95')
    expect(res.body.ok).toBe(true)
    expect(res.body.contentCount).toBe(1)
  })

  it('does not prune Notion search records when the Notion source could not be reloaded', async () => {
    requireAdminRequest.mockResolvedValue({ ok: true, userId: 'admin-1' })
    loadPublicContentIndex.mockResolvedValueOnce({ items: [item], source: 'database' })
    enrichNotionSearchBodies.mockResolvedValueOnce({ items: [item], total: 0, enriched: 0, failed: 0 })
    const res = createRes()
    await handler({ method: 'POST', body: { path: '/content' } }, res)

    expect(syncAlgoliaContent).toHaveBeenCalledWith([item], { pruneNotion: false })
    expect(res.body.ok).toBe(false)
    expect(res.body.warnings.join(' ')).toContain('Notion')
  })

  it('returns a usable partial result when Algolia is temporarily unavailable', async () => {
    requireAdminRequest.mockResolvedValue({ ok: true, userId: 'admin-1' })
    syncAlgoliaContent.mockRejectedValue(new Error('Algolia unavailable'))
    const res = createRes()
    await handler({ method: 'POST', body: { path: '/desk/system' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.warnings.join(' ')).toContain('Algolia')
    expect(res.body.contentCount).toBe(1)
  })
})
