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
    expect(batchPaths[1]).toContain('order=version.desc')
    expect(batchPaths[2]).toContain('/content_display?')
    expect(batchPaths[0]).toContain(`id=in.(${itemId})`)
    expect(batchPaths[1]).toContain(`item_id=in.(${itemId})`)
    expect(batchPaths[2]).toContain(`item_id=in.(${itemId})`)
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

  it('does not add a version when an explicit body has the existing checksum', async () => {
    mockExistingEntry()

    await updateKnowledgeEntry(ownerId, itemId, { bodyMarkdown: '旧正文' })

    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/content_versions?') && options?.method === 'POST'
      )
    ).toBe(false)
    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/content_access?') &&
        options?.method === 'POST' &&
        options?.headers?.Prefer.includes('resolution=merge-duplicates')
      )
    ).toBe(true)
  })

  it('does not add a version for non-body updates even if a stored checksum is stale', async () => {
    mockExistingEntry({
      version: { ...versionRow, checksum: 'legacy-checksum' }
    })

    await updateKnowledgeEntry(ownerId, itemId, { title: '新标题' })

    expect(
      supabaseRest.mock.calls.some(([path, options]) =>
        path.startsWith('/content_versions?') && options?.method === 'POST'
      )
    ).toBe(false)
  })

  it('adds the next unpublished version only when the body checksum changes', async () => {
    mockExistingEntry()

    const updated = await updateKnowledgeEntry(ownerId, itemId, {
      bodyMarkdown: '新正文'
    })

    const versionCall = supabaseRest.mock.calls.find(([path, options]) =>
      path.startsWith('/content_versions?') && options?.method === 'POST'
    )
    expect(JSON.parse(versionCall[1].body)).toEqual(expect.objectContaining({
      item_id: itemId,
      version: 3,
      body_markdown: '新正文',
      is_published: false
    }))
    expect(updated.bodyMarkdown).toBe('新正文')
    expect(updated.version).toBe(3)
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
