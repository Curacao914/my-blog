const fs = require('fs')

function source(path) {
  return fs.readFileSync(path, 'utf8')
}

describe('post-release hardening regressions', () => {
  it('does not treat missing Notion slugs or passwords as missing content', () => {
    const text = source('lib/content/notionIndex.js')
    expect(text).toContain("page?.slug || page?.id")
    expect(text).toContain("mode: passwordProtected ? 'password' : 'public'")
    expect(text).toContain('return stableId')
    expect(text).not.toContain('!page?.password')

    const siteData = source('lib/db/SiteDataApi.js')
    const slugIndex = siteData.indexOf("element.slug = String(element.id).replace(/-/g, '')")
    const adjustIndex = siteData.indexOf('adjustPageProperties(element, NOTION_CONFIG)')
    expect(slugIndex).toBeGreaterThan(-1)
    expect(adjustIndex).toBeGreaterThan(slugIndex)
  })

  it('shows loading before schedule and reading empty states', () => {
    const today = source('components/TodayBoard.js')
    const reading = source('components/ReadingBox.js')
    const readingCache = source('lib/client/readingItemsCache.js')
    // LAWTECH_READING_V3_REFRESH_CONTRACT
    const notes = source('components/NotesDesk.js')

    expect(today).toContain('sessionLoading || !profileId || !isReady')
    expect(today).toContain("setNotice('正在同步最新数据')")
    expect(reading).toContain("loadState === 'loading'")
    expect(reading).toContain('mutationVersionRef')
    expect(reading).toContain('buildReadingMutation')
    expect(reading).toContain('/api/reading/items')
    expect(reading).toContain('prepareReadingLibraryItems')
    expect(readingCache).toContain('const inflight = new Map()')
    expect(notes).toContain("loadState === 'loading'")
  })

  it('deduplicates schedule reads across workspace surfaces', () => {
    const cache = source('lib/client/scheduleItemsCache.js')
    expect(cache).toContain('const inflight = new Map()')
    expect(cache).toContain('if (inflight.has(profileId))')
  })

  it('allows reading notes and quick notes to use publication settings', () => {
    const api = source('pages/api/writing/publication.js')
    const notes = source('components/NotesDesk.js')
    expect(api).toContain("['writing', 'reading', 'quick_note']")
    expect(api).toContain("type: 'reading-note'")
    expect(api).toContain("noteOrigin(note) === 'writing' ? 'writing' : 'notes'")
    expect(api).toContain('profileCan(auth.profile, requiredPermission)')
    expect(notes).toContain('WritingPublishDialog')
    expect(notes).toContain('发布设置')
  })

  it('keeps image mirror failures non-fatal to the Notion batch', () => {
    const relay = source('lib/content/notionRelaySync.js')
    expect(relay).toContain('failOnError: false')
    expect(relay).toContain('stats.imageFailures')
  })
})
