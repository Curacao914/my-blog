const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('public content discovery and syndication', () => {
  const home = read('pages/index.js')
  const search = read('pages/search/index.js')
  const legacySearch = read('pages/search/[keyword]/index.js')
  const publicIndex = read('lib/content/publicIndex.js')
  const feed = read('lib/content/publicFeed.js')
  const sitemap = read('pages/sitemap.xml.js')
  const navigation = read('lib/domain/navigation.js')
  const coursePublication = read('pages/api/courses/jobs/[id]/publication.js')
  const contentManagement = read('pages/api/content/manage.js')

  it('uses one federated public index on home, content and search pages', () => {
    expect(publicIndex).toContain('normalizeNotionContentIndex')
    expect(publicIndex).toContain('getPublicLiveContentIndex')
    expect(publicIndex).toContain('listPublishedContentMetadata')
    expect(home).toContain("from: 'law-tech-home'")
    expect(search).toContain("from: 'law-tech-search'")
  })

  it('shows recent public content and a stable library map on the homepage', () => {
    expect(home).toContain('最近内容')
    expect(home).toContain('PublicContentCard')
    expect(home).toContain("['遇事不决', '法与算法', '法律之上', '秘密花园']")
    expect(home).toContain('DynamicSignature')
  })

  it('replaces the Notion-only search route with unified discovery', () => {
    expect(search).toContain('filterPublicContent')
    expect(search).toContain('/api/search?')
    expect(search).toContain('全文搜索')
    expect(legacySearch).toContain("`/search?q=${encodeURIComponent(keyword)}`")
    expect(navigation).toContain("key: 'search'")
  })

  it('syndicates only opted-in public content to feeds and sitemap', () => {
    expect(feed).toContain('selectRssPublicContent')
    expect(feed).toContain("feedLinks")
    expect(sitemap).toContain('selectSitemapPublicContent')
    expect(sitemap).toContain("`${link}${locale}/content`")
    expect(sitemap).toContain("`${link}${locale}/search`")
  })

  it('refreshes home and search when publishing or withdrawing content', () => {
    expect(coursePublication).toContain('revalidatePublicContentSurfaces')
    expect(contentManagement).toContain('revalidatePublicContentSurfaces')
  })
})
