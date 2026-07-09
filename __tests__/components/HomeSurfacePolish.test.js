const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')
const header = fs.readFileSync(path.join(root, 'components/law-tech/PublicHeader.js'), 'utf8')


describe('homepage macOS glass system', () => {
  it('uses a single-screen macOS workspace instead of billboard copy', () => {
    expect(home).toContain('home-macos-unified-v2')
    expect(home).toContain('HomePanelTabs')
    expect(home).toContain('RecentRotor')
    expect(home).toContain('DynamicSignature')
    expect(home).toContain('home-random-link')
    expect(home).not.toContain('把麻烦事收进抽屉')
    expect(home).not.toContain('最近翻开的纸页')
    expect(home).not.toContain('左右拖动切换')
    expect(home).not.toContain('先把文件名改对')
  })

  it('keeps search in the public menu bar and restores hover-follow navigation', () => {
    expect(header).toContain('public-header-macos')
    expect(header).toContain('public-nav-indicator')
    expect(header).toContain('public-header-search')
    expect(header).toContain('--header-light-x')
    expect(header).not.toContain('border-radius:10px')
  })
})
