const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const home = read('pages/index.js')
const tools = read('pages/tools/index.js')
const about = read('pages/about/index.js')
const editor = read('components/about/PublicProfileEditor.js')
const systemDesk = read('components/SystemDesk.js')
const searchApi = read('pages/api/search.js')
const profileApi = read('pages/api/site-profile.js')
const imageApi = read('pages/api/site-profile-image.js')
const styles = read('styles/lawtech-system.css')

describe('system UI round 5 compatibility', () => {
  it('keeps four switchable Home application views in the title bar', () => {
    for (const key of ['library', 'spaces', 'chronicle', 'studio']) expect(home).toContain(`key: '${key}'`)
    expect(home).toContain('home-window-switcher')
    expect(home).toContain('LibraryWindow')
    expect(home).toContain('SpacesWindow')
    expect(home).toContain('ChronicleWindow')
    expect(home).toContain('StudioWindow')
    expect(home).not.toContain('function AppRail')
  })

  it('keeps an automatic article stack and looping restrained signature', () => {
    expect(home).toContain('ArticleStack')
    expect(home).toContain('window.setInterval')
    expect(home).toContain('5000')
    expect(home).toContain('home-stack-card-v6')
    expect(home).toContain('<DynamicSignature compact loop />')
  })

  it('keeps compact Tools and owner-editable About data', () => {
    expect(tools).toContain('tools-compact-grid')
    expect(about).toContain('About</span><h2>关于')
    expect(about).toContain('getWorkspaceSession')
    expect(about).toContain('!session.isOwner')
    expect(editor).toContain('PublicProfileEditor')
    expect(editor).toContain('首页状态')
    expect(systemDesk).toContain("{ key: 'public-profile', label: '首页' }")
    expect(profileApi).toContain('savePublicSiteProfile')
    expect(imageApi).toContain('getSupabaseStorageConfig')
  })

  it('keeps full-body search when Algolia is unavailable locally', () => {
    expect(searchApi).toContain('searchAlgoliaContent')
    expect(searchApi).toContain('includeBody: true')
    expect(searchApi).toContain("mode: 'local-body'")
  })

  it('retains calmer content card hierarchy', () => {
    expect(styles).toContain('.content-library-page .content-library-card h5')
    expect(styles).toContain('.content-library-page .content-library-card p')
  })
})
