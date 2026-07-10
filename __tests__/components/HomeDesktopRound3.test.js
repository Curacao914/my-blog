const fs = require('fs')
const path = require('path')

describe('round 3 clean homepage desktop', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'pages/index.js'), 'utf8')

  it('uses the bare layout so the old theme shell cannot overlay the system shell', () => {
    expect(page).toContain("HomeDesktop.layout = 'bare'")
    expect(page).toContain('<PublicHeader />')
  })

  it('keeps the homepage as one stable desktop instead of nested tabs', () => {
    expect(page).toContain('home-desktop-round3-clean')
    expect(page).not.toContain('home-tab')
    expect(page).not.toContain('activeTab')
    expect(page).not.toContain('WorkspacePreview')
  })

  it('keeps recent content as a single-column filmstrip with real cards', () => {
    expect(page).toContain('home-recent-filmstrip')
    expect(page).toContain('home-recent-card')
    expect(page).not.toContain('grid-template-columns: repeat(2')
  })

  it('keeps real visual surfaces for content covers', () => {
    expect(page).toContain('home-feature-cover')
    expect(page).toContain('coverStyle(item')
    expect(page).toContain('backgroundImage')
  })
})
