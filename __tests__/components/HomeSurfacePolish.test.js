const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')
const header = fs.readFileSync(path.join(root, 'components/law-tech/PublicHeader.js'), 'utf8')

describe('homepage macOS glass system v3', () => {
  it('keeps the homepage as a single-screen app window without billboard copy', () => {
    expect(home).toContain('home-os-v3')
    expect(home).toContain('height:100dvh')
    expect(home).toContain('home-window')
    expect(home).toContain('RecentCarousel')
    expect(home).not.toContain('最近翻开的纸页')
    expect(home).not.toContain('把麻烦事收进抽屉')
    expect(home).not.toContain('滑动切换')
  })
  it('moves search into the menu bar and removes the duplicate search nav item', () => {
    expect(header).toContain('public-header-search')
    expect(header).toContain("item.key !== 'search'")
    expect(header).toContain('public-nav-indicator')
    expect(header).not.toContain('background:rgba(220,233,223,.58)')
  })
  it('adds a real random article action instead of a fixed link', () => {
    expect(home).toContain('function openRandom')
    expect(home).toContain('Math.floor(Math.random() * randomPool.length)')
    expect(home).toContain('随机一页')
  })
})
