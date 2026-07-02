const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('progressive full-text search and admin sync', () => {
  const search = read('pages/search/index.js')
  const searchApi = read('pages/api/search.js')
  const syncApi = read('pages/api/content/sync.js')
  const algolia = read('lib/content/algoliaSearch.js')
  const publicIndex = read('lib/content/publicIndex.js')
  const notionSearch = read('lib/content/notionSearch.js')

  it('uses Algolia when configured and keeps local search as fallback', () => {
    expect(search).toContain("fetch(`/api/search?")
    expect(search).toContain('localResults')
    expect(search).toContain('mergeResults')
    expect(searchApi).toContain('searchAlgoliaContent')
    expect(algolia).toContain('ALGOLIA_SEARCH_ONLY_APP_KEY')
  })

  it('syncs Notion, database bodies, page caches and Algolia behind admin auth', () => {
    expect(syncApi).toContain('requireAdminRequest')
    expect(syncApi).toContain('delCacheData')
    expect(syncApi).toContain('includeBody: true')
    expect(syncApi).toContain('syncAlgoliaContent')
    expect(syncApi).toContain('enrichNotionSearchBodies')
    expect(notionSearch).toContain('getPageContentText')
    expect(publicIndex).toContain('clearPublicContentIndexCache')
  })

  it('never sends private content into the Algolia index', () => {
    expect(algolia).toContain("item.access?.mode === 'public'")
    expect(algolia).toContain('item.access?.allowIndexing !== false')
  })

  it('only prunes stale Notion records after a successful Notion read', () => {
    expect(algolia).toContain('options.pruneNotion === true')
    expect(algolia).toContain('browseObjects')
    expect(syncApi).toContain("pruneNotion: String(source || '').split('+').includes('notion')")
  })
})
