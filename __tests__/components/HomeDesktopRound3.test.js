const fs = require('fs')
const path = require('path')

const pagePath = path.join(__dirname, '../../pages/index.js')
const pageSource = fs.readFileSync(pagePath, 'utf8')

jest.mock('@/lib/content/publicIndex', () => ({ loadPublicContentIndex: jest.fn() }))
jest.mock('@/lib/siteProfile', () => ({
  getPublicSiteProfile: jest.fn().mockResolvedValue({ name: 'Curacao', focus: { title: '进行中' } }),
  normalizeSiteProfile: value => ({ focus: {}, ...value })
}))

const { loadPublicContentIndex } = require('@/lib/content/publicIndex')
const { buildHomeDesktopModel, getStaticProps, default: HomeDesktop } = require('../../pages/index')

describe('home desktop data contract', () => {
  it('builds a stable model from the real { items, source } contract', () => {
    const duplicatedHref = '/content/shared'
    const model = buildHomeDesktopModel({
      source: 'live-json+database',
      items: [
        { id: 'older', title: '旧内容', type: 'article', href: duplicatedHref, date: '2026-06-01', category: '法与算法', tags: ['系统', '写作'] },
        { id: 'latest', title: '最新内容', type: 'course-note', href: '/content/latest', date: '2026-07-09', category: '课程', cover: '/latest.jpg', tags: ['系统', '课程'] },
        { id: 'duplicate', title: '重复链接', type: 'article', href: duplicatedHref, date: '2026-07-01', category: '法与算法', tags: ['写作'] },
        null
      ]
    })

    expect(model.source).toBe('live-json+database')
    expect(model.recent[0].id).toBe('latest')
    expect(model.carousel[0].cover).toBe('/latest.jpg')
    expect(model.randomItems).toEqual(['/content/shared', '/content/latest'])
    expect(model.counts).toMatchObject({ total: 3, articles: 2, courseNotes: 1, categories: 2 })
    expect(model.connections[0]).toMatchObject({ tags: ['系统'] })
  })

  it('stays usable when the index is empty or malformed', () => {
    expect(buildHomeDesktopModel(null)).toMatchObject({ source: 'empty', recent: [], carousel: [], randomItems: [], spaces: [], connections: [] })
    expect(buildHomeDesktopModel({ items: { invalid: true } }).counts.total).toBe(0)
  })

  it('passes the normalized model and profile through static props', async () => {
    loadPublicContentIndex.mockResolvedValueOnce({ items: [{ id: 'one', title: '一条内容', href: '/content/one' }], source: 'notion' })
    await expect(getStaticProps()).resolves.toMatchObject({ props: { model: { source: 'notion', counts: { total: 1 } }, profile: { name: 'Curacao' } }, revalidate: 1800 })
    expect(loadPublicContentIndex).toHaveBeenCalledWith({ from: 'law-tech-home-round7' })
  })

  it('keeps the homepage bare and avoids a second system navigation', () => {
    expect(HomeDesktop.layout).toBe('bare')
    expect(pageSource).toContain("<PublicHeader active='home'")
    expect(pageSource).not.toContain("className='home-app-rail'")
    expect(pageSource).not.toContain('<LawTechDeskStyles')
  })
})
