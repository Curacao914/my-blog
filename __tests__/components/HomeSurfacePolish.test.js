const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')
const header = fs.readFileSync(path.join(root, 'components/law-tech/PublicHeader.js'), 'utf8')
const deskStyles = fs.readFileSync(path.join(root, 'components/LawTechDeskStyles.js'), 'utf8')

describe('macOS glass unified surface', () => {
  it('moves the homepage into the macOS-inspired single-screen workspace', () => {
    expect(home).toContain('mac-home-v3')
    expect(home).toContain('mac-home-workspace')
    expect(home).toContain('HomePanelDeck')
    expect(home).toContain('home-panel-viewport')
    expect(home).not.toContain('home-editorial-v3')
    expect(home).not.toContain('home-editorial-hero')
  })

  it('keeps recent content data-driven and reuses the dynamic signature', () => {
    expect(home).toContain('selectRecentPublicContent(items, 7)')
    expect(home).toContain('updates.map(item => <RecentLine')
    expect(home).toContain('DynamicSignature compact')
    expect(home).toContain('publicHomeDailyLines')
  })

  it('keeps search in the top menu rather than the dock', () => {
    expect(header).toContain('mac-public-search')
    expect(header).toContain("action='/search'")
    expect(home).toContain("item.href !== '/search'")
  })

  it('keeps the shared hover-follow and glass vocabulary available across pages', () => {
    expect(header).toContain('mac-public-nav-indicator')
    expect(header).toContain('--header-light-x')
    expect(deskStyles).toContain('macos-glass-unified-v1')
    expect(deskStyles).toContain('--glass-border')
  })
})
