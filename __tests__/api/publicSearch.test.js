import handler from '@/pages/api/search'
import { searchAlgoliaContent } from '@/lib/content/algoliaSearch'

jest.mock('@/lib/content/algoliaSearch', () => ({ searchAlgoliaContent: jest.fn() }))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/search', () => {
  beforeEach(() => jest.clearAllMocks())

  it('passes bounded public search filters to Algolia', async () => {
    searchAlgoliaContent.mockResolvedValue({ available: true, hits: [{ id: 'a' }], total: 1, page: 0, pages: 1, processingTimeMS: 3 })
    const res = createRes()
    await handler({ method: 'GET', query: { q: '国家责任', category: '遇事不决', type: 'course-note', hitsPerPage: '1000' } }, res)

    expect(res.statusCode).toBe(200)
    expect(searchAlgoliaContent).toHaveBeenCalledWith(expect.objectContaining({
      query: '国家责任',
      category: '遇事不决',
      type: 'course-note',
      hitsPerPage: 1000
    }))
    expect(res.body.available).toBe(true)
    expect(res.headers['Cache-Control']).toContain('stale-while-revalidate')
  })

  it('degrades to the local index contract when Algolia fails', async () => {
    searchAlgoliaContent.mockRejectedValue(new Error('offline'))
    const res = createRes()
    await handler({ method: 'GET', query: { q: '经济法' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(expect.objectContaining({ available: false, hits: [], total: 0 }))
  })
})
