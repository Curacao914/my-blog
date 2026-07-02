import { normalizeNotionContentIndex } from '@/lib/content/notionIndex'

describe('Notion content index compatibility', () => {
  it('keeps published Notion posts on their existing routes and gives them a readable collection', () => {
    const items = normalizeNotionContentIndex([
      {
        id: 'notion-1',
        slug: 'article/market-failure',
        type: 'Post',
        status: 'Published',
        title: '市场失灵',
        summary: '摘要',
        category: '法律之上',
        tags: ['经济法'],
        publishDate: Date.parse('2026-06-01T00:00:00Z')
      },
      { slug: 'draft', type: 'Post', status: 'Invisible', title: '草稿' },
      { slug: 'locked', type: 'Post', status: 'Published', title: '密码文章', password: 'secret' }
    ])

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      slug: 'article/market-failure',
      href: '/article/market-failure',
      source: 'notion',
      category: '法律之上',
      collection: '文章',
      folder: { path: ['法律之上', '文章'] }
    })
  })
})
