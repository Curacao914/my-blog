
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const header = fs.readFileSync(path.join(root, 'components/law-tech/PublicHeader.js'), 'utf8')
const icons = fs.readFileSync(path.join(root, 'components/LawTechIcons.js'), 'utf8')

describe('round 2 system shell', () => {
  it('keeps the system shell styles global so dock cannot render as plain text', () => {
    expect(header).toContain('<style jsx global>')
    expect(header).toContain('.system-dock')
    expect(header).toContain('.system-dock-item')
    expect(header).not.toContain('<style jsx>{`')
  })

  it('keeps search as a slim menu-bar field instead of a nav item', () => {
    expect(header).toContain("['content', 'tools', 'about']")
    expect(header).toContain('system-menu-search')
    expect(header).toContain("action='/search'")
  })

  it('raises account popovers above the system shell', () => {
    expect(header).toContain('z-index: 8000 !important')
    expect(header).toContain('[data-radix-popper-content-wrapper]')
  })

  it('provides icon-only dock entries with hover labels', () => {
    expect(header).toContain('RandomDockLink')
    expect(header).toContain("title='随机一页'")
    expect(icons).toContain('export function LawTechIcon')
    expect(icons).toContain('random:')
  })
})
