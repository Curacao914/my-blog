const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const directoryPage = fs.readFileSync(path.join(root, 'components/content/PublicDirectoryPage.js'), 'utf8')
const toolsPage = fs.readFileSync(path.join(root, 'pages/tools/index.js'), 'utf8')
const aboutPage = fs.readFileSync(path.join(root, 'pages/about/index.js'), 'utf8')
const contentCard = fs.readFileSync(path.join(root, 'components/content/PublicContentCard.js'), 'utf8')

describe('public macOS glass system', () => {
  it('uses app-window layout for content directories', () => {
    expect(directoryPage).toContain('public-directory-app-window-v2')
    expect(directoryPage).toContain('directory-window-top')
    expect(directoryPage).toContain('directory-sidebar')
    expect(directoryPage).toContain('DynamicSignature')
  })

  it('rebuilds tools and about pages as matching app windows', () => {
    expect(toolsPage).toContain('public-tools-app-window-v2')
    expect(toolsPage).toContain('tools-window-top')
    expect(aboutPage).toContain('public-about-resume-v2')
    expect(aboutPage).toContain('Education')
    expect(aboutPage).toContain('Skills')
  })

  it('keeps content cards in the lighter window material family', () => {
    expect(contentCard).toContain('public-content-card-window-v2')
    expect(contentCard).toContain('min-height:96px')
    expect(contentCard).not.toContain('min-height:228px')
  })
})
