const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const header = fs.readFileSync(path.join(root, 'components/law-tech/PublicHeader.js'), 'utf8')
const icons = fs.readFileSync(path.join(root, 'components/LawTechIcons.js'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'styles/lawtech-system.css'), 'utf8')

describe('shared macOS system shell', () => {
  it('keeps one shared Menu Bar and Dock component', () => {
    expect(header).toContain("className='public-header system-menu-bar'")
    expect(header).toContain("className='system-dock'")
    expect(header).toContain('SystemDock')
    expect(header).not.toContain('<style jsx global>')
  })

  it('adds Home before Content and keeps the same chrome across apps', () => {
    expect(header.indexOf("key: 'home'")).toBeLessThan(header.indexOf("key: 'content'"))
    expect(header).toContain("<DockItem active={active === 'home'}")
    expect(header).toContain("<DockItem active={active === 'desk'}")
  })

  it('uses Algolia-backed suggestions and the command search shortcut', () => {
    expect(header).toContain('SystemSearch')
    expect(header).toContain("event.key.toLowerCase() === 'k'")
    expect(header).toContain("fetch(`/api/search?q=${encodeURIComponent(keyword)}&hitsPerPage=6`")
    expect(header).toContain("placeholder='搜索标题、内容或标签'")
  })

  it('provides a longer but quieter icon Dock', () => {
    expect((header.match(/<DockItem /g) || []).length).toBe(7)
    expect(header).toContain('RandomDockLink')
    expect(styles).toContain('width: 36px')
    expect(styles).toContain('transform: translateY(-2px) scale(1.035)')
    expect(styles).toContain('.system-dock-item.is-active')
    expect(styles).toContain('transform: none')
    for (const icon of ['home:', 'content:', 'archive:', 'search:', 'random:', 'tools:', 'about:', 'desk:']) {
      expect(icons).toContain(icon)
    }
  })
})
