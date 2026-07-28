import {
  archiveKnowledgeEntry,
  createKnowledgeEntry,
  listKnowledgeEntries,
  updateKnowledgeEntry
} from '@/lib/server/knowledgeRepository'
import { supabaseRest } from '@/lib/server/supabase'

jest.mock('@/lib/server/supabase', () => ({
  supabaseRest: jest.fn()
}))

const ownerId = '11111111-1111-4111-8111-111111111111'
const itemId = '22222222-2222-4222-8222-222222222222'
const secondItemId = '44444444-4444-4444-8444-444444444444'

const itemRow = {
  id: itemId,
  owner_id: ownerId,
  slug: 'knowledge-existing',
  title: '平台责任',
  summary: '旧摘要',
  type: 'knowledge',
  status: 'draft',
  source: 'manual',
  created_at: '2026-07-28T01:00:00.000Z',
  updated_at: '2026-07-28T02:00:00.000Z'
}

const entryRow = {
  item_id: itemId,
  owner_id: ownerId,
  kind: 'concept',
  state: 'active',
  domain: '平台治理',
  topic: '算法责任',
  seed_text: '从判例开始',
  review_status: 'reviewed',
  provenance: [],
  show_on_home: true,
  search_text: '平台责任 旧摘要 旧正文 平台治理 算法责任 证据 从判例开始',
  updated_at: '2026-07-28T03:00:00.000Z'
}

const versionRow = {
  id: '33333333-3333-4333-8333-333333333333',
  item_id: itemId,
  version: 2,
  body_markdown: '旧正文',
  checksum: '523ea6b3730dd6d940058a3f367c989386c420121190001cef0aad3d94509d19',
  is_published: false
}

const displayRow = {
  item_id: itemId,
  category: '轻知识',
  tags: ['证据'],
  folder_path: ['轻知识', '平台治理'],
  pinned: false,
  show_in_recent: false
}

function mockExistingEntry({ version = versionRow } = {}) {
  supabaseRest.mockImplementation(async (path, options = {}) => {
    if (path.startsWith('/content_items?') && (!options.method || options.method === 'GET')) {
      return [itemRow]
    }
    if (path.startsWith('/knowledge_entries?') && (!options.method || options.method === 'GET')) {
      return [entryRow]
    }
    if (path.startsWith('/content_versions?') && (!options.method || options.method === 'GET')) {
      return [version]
    }
    if (path.startsWith('/content_display?') && (!options.method || options.method === 'GET')) {
      return [displayRow]
    }
    if (path.startsWith('/content_items?') && options.method === 'PATCH') {
      return [{ ...itemRow, ...JSON.parse(options.body) }]
    }
    if (path.startsWith('/knowledge_entries?') && options.method === 'PATCH') {
      return [{ ...entryRow, ...JSON.parse(options.body) }]
    }
    if (path.startsWith('/content_display?') && options.method === 'PATCH') {
      return [{ ...displayRow, ...JSON.parse(options.body) }]
    }
    if (path.startsWith('/content_access?') && options.method === 'POST') {
      return [{ item_id: itemId, ...JSON.parse(options.body) }]
    }
    if (path.startsWith('/content_versions?') && options.method === 'POST') {
      return [{ ...versionRow, ...JSON.parse(options.body) }]
    }
    return []
  })
}

describe('knowledgeRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lists owner-scoped knowledge with child filters and exactly three batch reads', async () => {
    supabaseRest
      .mockResolvedValueOnce([entryRow])
      .mockResolvedValueOnce([itemRow])
      .mockResolvedValueOnce([
        versionRow,
        { ...versionRow, id: 'older', version: 1, body_markdown: '更旧正文' }
      ])
      .mockResolvedValueOnce([displayRow])

    const entries = await listKnowledgeEntries(ownerId, {
      kind: 'concept',
      domain: '平台治理',
      showOnHome: true,
      q: '责任',
      limit: 999
    })

    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual(expect.objectContaining({
      id: itemId,
      ownerId,
      bodyMarkdown: '旧正文',
      kind: 'concept'
    }))
    expect(supabaseRest).toHaveBeenCalledTimes(4)
    expect(supabaseRest.mock.calls[0][0]).toContain('/knowledge_entries?')
    expect(supabaseRest.mock.calls[0][0]).toContain(`owner_id=eq.${ownerId}`)
    expect(supabaseRest.mock.calls[0][0]).toContain('state=neq.archived')
    expect(supabaseRest.mock.calls[0][0]).toContain('kind=eq.concept')
    expect(supabaseRest.mock.calls[0][0]).toContain('domain=eq.%E5%B9%B3%E5%8F%B0%E6%B2%BB%E7%90%86')
    expect(supabaseRest.mock.calls[0][0]).toContain('show_on_home=eq.true')
    expect(supabaseRest.mock.calls[0][0]).toContain('search_text=ilike.*%E8%B4%A3%E4%BB%BB*')
    expect(supabaseRest.mock.calls[0][0]).toContain('limit=100')

    const batchPaths = supabaseRest.mock.calls.slice(1).map(([path]) => path)
    expect(batchPaths[0]).toContain('/content_items?')
    expect(batchPaths[0]).toContain(`owner_id=eq.${ownerId}`)
    expect(batchPaths[0]).toContain('type=eq.knowledge')
    expect(batchPaths[1]).toContain('/content_versions?')
    expect(batchPaths[1]).toContain('order=item_id.asc,version.desc')
    expect(batchPaths[1]).toContain('limit=200')
    expect(batchPaths[1]).toContain('offset=0')
    expect(batchPaths[2]).toContain('/content_display?')
    expect(batchPaths[0]).toContain(`id=in.(${itemId})`)
    expect(batchPaths[1]).toContain(`item_id=in.(${itemId})`)
    expect(batchPaths[2]).toContain(`item_id=in.(${itemId})`)
  })

  it('pages stable batched version reads until every item can select its latest version', async () => {
    const secondEntry = { ...entryRow, item_id: secondItemId }
    const secondItem = {
      ...itemRow,
      id: secondItemId,
      slug: 'knowledge-second',
      title: '第二条'
    }
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      ...versionRow,
      id: `page-one-${index}`,
      version: 201 - index
    }))
    const secondPage = [
      { ...versionRow, id: 'oldest-first-item', version: 1 },
      {
        ...versionRow,
        id: 'latest-second-item',
        item_id: secondItemId,
        version: 5,
        body_markdown: '第二条正文'
      }
    ]

    supabaseRest.mockImplementation(async (path) => {
      if (path.startsWith('/knowledge_entries?')) return [entryRow, secondEntry]
      if (path.startsWith('/content_items?')) return [itemRow, secondItem]
      if (path.startsWith('/content_display?')) {
        return [
          displayRow,
          { ...displayRow, item_id: secondItemId }
        ]
      }
      if (path.startsWith('/content_versions?') && path.includes('offset=0')) {
        return firstPage
      }
      if (path.startsWith('/content_versions?') && path.includes('offset=200')) {
        return secondPage
      }
      return []
    })

    const entries = await listKnowledgeEntries(ownerId)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual(expect.objectContaining({
      id: itemId,
      version: 201
    }))
    expect(entries[1]).toEqual(expect.objectContaining({
      id: secondItemId,
      version: 5,
      bodyMarkdown: '第二条正文'
    }))
    const versionPaths = supabaseRest.mock.calls
      .map(([path]) => path)
      .filter(path => path.startsWith('/content_versions?'))
    expect(versionPaths).toHaveLength(2)
    expect(versionPaths[0]).toContain('order=item_id.asc,version.desc')
    expect(versionPaths[0]).toContain('limit=200')
    expect(versionPaths[0]).toContain('offset=0')
    expect(versionPaths[1]).toContain('limit=200')
    expect(versionPaths[1]).toContain('offset=200')
    for (const path of versionPaths) {
      expect(path).toContain(`item_id=in.(${itemId},${secondItemId})`)
    }
  })

  it('fails with a controlled error when version paging reaches its safety limit', async () => {
    const fullPage = Array.from({ length: 200 }, (_, index) => ({
      ...versionRow,
      id: `full-page-${index}`,
      version: 200 - index
    }))
    supabaseRest.mockImplementation(async (path) => {
      if (path.startsWith('/knowledge_entries?')) return [entryRow]
      if (path.startsWith('/content_items?')) return [itemRow]
      if (path.startsWith('/content_display?')) return [displayRow]
      if (path.startsWith('/content_versions?')) return fullPage
      return []
    })

    await expect(listKnowledgeEntries(ownerId)).rejects.toMatchObject({
      status: 503,
      code: 'knowledge_versions_page_limit',
      isKnowledgeRepositoryError: true
    })
    const versionCalls = supabaseRest.mock.calls.filter(([path]) =>
      path.startsWith('/content_versions?')
    )
    expect(versionCalls.length).toBeGreaterThan(1)
    expect(versionCalls.length).toBeLessThanOrEqual(50)
  })

  it('creates a private manual draft with version, display and searchable knowledge rows', async () => {
    supabaseRest.mockImplementation(async (path, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : {}
      if (path.startsWith('/content_items?') && options.method === 'POST') {
        return [{ ...itemRow, ...body, id: itemId }]
      }
      if (path.startsWith('/content_versions?') && options.method === 'POST') {
        return [{ ...versionRow, ...body, id: versionRow.id }]
      }
      if (path.startsWith('/content_access?') && options.method === 'POST') return [body]
      if (path.startsWith('/content_display?') && options.method === 'POST') return [body]
      if (path.startsWith('/knowledge_entries?') && options.method === 'POST') {
        return [{ ...entryRow, ...body }]
      }
      return []
    })

    const created = await createKnowledgeEntry(ownerId, {
      title: ' 平台责任 ',
      summary: ' 摘要 ',
      bodyMarkdown: ' 正文 ',
      domain: ' 平台治理 ',
      tags: ['证据'],
      showOnHome: true
    })

    expect(created).toEqual(expect.objectContaining({
      id: itemId,
      ownerId,
      title: '平台责任',
      bodyMarkdown: '正文'
    }))

    const calls = supabaseRest.mock.calls.map(([path, options]) => ({
      path,
      method: options?.method,
      body: options?.body ? JSON.parse(options.body) : null
    }))
    expect(calls.find(call => call.path.startsWith('/content_items?')).body).toEqual(
      expect.objectContaining({
        owner_id: ownerId,
        type: 'knowledge',
        status: 'draft',
        source: 'manual'
      })
    )
    expect(calls.find(call => call.path.startsWith('/content_items?')).body.slug)
      .toMatch(/^knowledge-[0-9a-f-]{36}$/)
    expect(calls.find(call => call.path.startsWith('/content_versions?')).body).toEqual(
      expect.objectContaining({
        item_id: itemId,
        version: 1,
        body_markdown: '正文',
        is_published: false
      })
    )
    expect(calls.find(call => call.path.startsWith('/content_versions?')).body.checksum)
      .toMatch(/^[0-9a-f]{64}$/)
    expect(calls.find(call => call.path.startsWith('/content_access?')).body).toEqual({
      item_id: itemId,
      mode: 'private',
      password_hash: null,
      expires_at: null,
      allow_indexing: false,
      allow_rss: false,
      allow_sitemap: false
    })
    expect(calls.find(call => call.path.startsWith('/content_display?')).body).toEqual(
      expect.objectContaining({
        item_id: itemId,
        category: '轻知识',
        tags: ['证据'],
        folder_path: ['轻知识', '平台治理'],
        pinned: false,
        show_in_recent: false
      })
    )
    expect(calls.find(call => call.path.startsWith('/knowledge_entries?')).body.search_text)
      .toContain('平台责任')
    expect(calls.find(call => call.path.startsWith('/knowledge_entries?')).body.search_text)
      .toContain('正文')
  })

  it('best-effort deletes a newly created item after a later create failure', async () => {
    const failure = new Error('access insert failed')
    supabaseRest.mockImplementation(async (path, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : {}
      if (path.startsWith('/content_items?') && options.method === 'POST') {
        return [{ ...itemRow, ...body, id: itemId }]
      }
      if (path.startsWith('/content_versions?') && options.method === 'POST') {
        return [{ ...versionRow, ...body }]
      }
      if (path.startsWith('/content_access?') && options.method === 'POST') throw failure
      if (path.startsWith('/content_items?') && options.method === 'DELETE') return []
      return []
    })

    await expect(createKnowledgeEntry(ownerId, {
      title: '平台责任',
      bodyMarkdown: '正文'
    })).rejects.toThrow('access insert failed')

    expect(supabaseRest).toHaveBeenCalledWith(
      expect.stringContaining(`/content_items?id=eq.${itemId}`),
      { method: 'DELETE' }
    )
    const cleanupPath = supabaseRest.mock.calls.at(-1)[0]
    expect(cleanupPath).toContain(`owner_id=eq.${ownerId}`)
    expect(cleanupPath).toContain('type=eq.knowledge')
  })

  it('updates through one atomic RPC, then reads the final entry', async () => {
    mockExistingEntry()

    await updateKnowledgeEntry(ownerId, itemId, {
      ownerId: 'client-owner',
      title: ' 新标题 ',
      bodyMarkdown: ' 新正文 ',
      kind: 'idea',
      domain: ' 平台治理 ',
      tags: ['证据', ' 证据 ', '责任'],
      showOnHome: false
    })

    const rpcCalls = supabaseRest.mock.calls.filter(([path]) =>
      path === '/rpc/law_tech_update_knowledge_entry'
    )
    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0][1]).toEqual({
      method: 'POST',
      body: JSON.stringify({
        p_owner_id: ownerId,
        p_item_id: itemId,
        p_patch: {
          title: '新标题',
          body_markdown: '新正文',
          kind: 'idea',
          domain: '平台治理',
          tags: ['证据', '责任'],
          show_on_home: false
        }
      })
    })
    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/content_items?') && options?.method === 'PATCH'
      )
    ).toBe(false)
    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/content_versions?') && options?.method === 'POST'
      )
    ).toBe(false)
    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/content_display?') && options?.method === 'PATCH'
      )
    ).toBe(false)
    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/knowledge_entries?') && options?.method === 'PATCH'
      )
    ).toBe(false)
    expect(supabaseRest).toHaveBeenCalledTimes(5)
  })

  it.each([
    ['kind', { kind: 'unknown' }, 'invalid_kind'],
    ['state', { state: 'published' }, 'invalid_state'],
    ['reviewStatus', { reviewStatus: 'pending' }, 'invalid_review_status'],
    ['showOnHome', { showOnHome: 'true' }, 'invalid_show_on_home'],
    ['tags', { tags: ['证据', 42] }, 'invalid_tags']
  ])('rejects invalid explicit %s before calling the RPC', async (_field, patch, code) => {
    await expect(updateKnowledgeEntry(ownerId, itemId, patch)).rejects.toMatchObject({
      status: 400,
      code,
      isKnowledgeRepositoryError: true
    })
    expect(supabaseRest).not.toHaveBeenCalled()
  })

  it('maps the RPC not-found signal to a controlled repository error', async () => {
    const rpcError = new Error('database rejected update')
    rpcError.data = { code: 'P0002' }
    supabaseRest.mockRejectedValue(rpcError)

    await expect(
      updateKnowledgeEntry(ownerId, itemId, { title: '新标题' })
    ).rejects.toMatchObject({
      status: 404,
      code: 'knowledge_not_found',
      isKnowledgeRepositoryError: true
    })
  })

  it('archives only the knowledge child state, never the content item status', async () => {
    mockExistingEntry()

    const archived = await archiveKnowledgeEntry(ownerId, itemId)

    expect(archived.state).toBe('archived')
    expect(supabaseRest).toHaveBeenCalledWith(
      expect.stringContaining(`/knowledge_entries?item_id=eq.${itemId}`),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"state":"archived"')
      })
    )
    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/content_items?') && ['PATCH', 'DELETE'].includes(options?.method)
      )
    ).toBe(false)
  })
})
