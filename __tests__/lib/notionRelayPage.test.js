import {
  fetchGlobalAllDataWithRelay,
  resolvePostPropsWithRelay
} from '@/lib/content/notionRelayPage'
import {
  getActiveNotionRelayPost,
  getActiveNotionRelaySiteData
} from '@/lib/content/notionRelayRepository'
import {
  fetchGlobalAllData,
  resolvePostProps
} from '@/lib/db/SiteDataApi'
import { processPostData } from '@/lib/utils/post'

jest.mock('@/lib/content/notionRelayRepository', () => ({
  getActiveNotionRelayPost: jest.fn(),
  getActiveNotionRelaySiteData: jest.fn()
}))
jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn(),
  resolvePostProps: jest.fn()
}))
jest.mock('@/lib/utils/post', () => ({ processPostData: jest.fn() }))

describe('Notion relay page resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getActiveNotionRelaySiteData.mockResolvedValue(null)
    getActiveNotionRelayPost.mockResolvedValue(null)
    fetchGlobalAllData.mockResolvedValue({ source: 'live' })
    resolvePostProps.mockResolvedValue({ post: { slug: 'live' } })
  })

  it('uses the active relay batch before the live Notion request', async () => {
    getActiveNotionRelayPost.mockResolvedValue({
      batch: {
        id: 'batch-1',
        promoted_at: '2026-06-28T00:00:00.000Z',
        site_data: { allPages: [{ id: 'page-1', slug: 'article/test', type: 'Post', status: 'Published' }] }
      },
      mapping: { slug: 'article/test' },
      snapshot: {
        checksum: 'checksum-1',
        post_data: { id: 'page-1', slug: 'article/test', title: 'Test' },
        block_map: { block: { 'page-1': { value: { id: 'page-1', parent_id: 'space' } } } }
      }
    })

    const result = await resolvePostPropsWithRelay({
      prefix: 'article',
      slug: 'test'
    })

    expect(resolvePostProps).not.toHaveBeenCalled()
    expect(result.post.slug).toBe('article/test')
    expect(result.NOTION_RELAY.batchId).toBe('batch-1')
    expect(processPostData).toHaveBeenCalled()
  })

  it('falls back to live Notion when no active snapshot exists', async () => {
    const result = await resolvePostPropsWithRelay({ prefix: 'article', slug: 'live' })
    expect(resolvePostProps).toHaveBeenCalled()
    expect(result.post.slug).toBe('live')
  })

  it('uses relay site metadata for static paths when available', async () => {
    getActiveNotionRelaySiteData.mockResolvedValue({ source: 'relay' })
    await expect(fetchGlobalAllDataWithRelay({ from: 'paths' })).resolves.toEqual({ source: 'relay' })
    expect(fetchGlobalAllData).not.toHaveBeenCalled()
  })
})
