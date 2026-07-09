const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '../..')
const contentPage = fs.readFileSync(path.join(root, 'pages/content/index.js'), 'utf8')
const publicCard = fs.readFileSync(path.join(root, 'components/content/PublicContentCard.js'), 'utf8')

describe('public browse macOS glass continuity', () => {
  it('wraps the content library in an app window with inherited chrome', () => {
    expect(contentPage).toContain('public-app-window content-library-window')
    expect(contentPage).toContain('public-window-titlebar')
    expect(contentPage).toContain('traffic')
    expect(contentPage).toContain('grid-template-columns:220px minmax(0,1fr)')
    expect(contentPage).toContain('min-height:154px')
    expect(contentPage).not.toContain('grid-template-columns: 250px minmax(0,1fr)')
  })
  it('keeps shared content cards in the lighter window material family', () => {
    expect(publicCard).toContain('public-content-card-window-v3')
    expect(publicCard).toContain('min-height:96px')
    expect(publicCard).toContain('min-height:148px')
    expect(publicCard).toContain('.is-compact .public-content-card-cover { min-height:80px; }')
    expect(publicCard).toContain('.is-featured .public-content-card-cover { min-height:150px; padding:20px; }')
  })
})
