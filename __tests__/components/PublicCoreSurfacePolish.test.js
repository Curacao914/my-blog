const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '../..')
const directoryPage = fs.readFileSync(path.join(root, 'components/content/PublicDirectoryPage.js'), 'utf8')
const toolsPage = fs.readFileSync(path.join(root, 'pages/tools/index.js'), 'utf8')
const aboutPage = fs.readFileSync(path.join(root, 'pages/about/index.js'), 'utf8')
const deskStyles = fs.readFileSync(path.join(root, 'components/LawTechDeskStyles.js'), 'utf8')

describe('public and desk macOS glass system v3', () => {
  it('uses app-window chrome for public directory pages', () => {
    expect(directoryPage).toContain('public-directory-app-window-v3')
    expect(directoryPage).toContain('public-window-titlebar')
    expect(directoryPage).toContain('traffic')
  })
  it('rebuilds tools and about pages as matching app windows', () => {
    expect(toolsPage).toContain('public-tools-app-window-v3')
    expect(toolsPage).toContain('public-tool-card-v3')
    expect(aboutPage).toContain('public-about-app-window-v3')
    expect(aboutPage).toContain('aboutProfile')
    expect(aboutPage).toContain('about-education')
    expect(aboutPage).toContain('about-skills')
  })
  it('visibly carries the app-window language into the private desk', () => {
    expect(deskStyles).toContain('macos-glass-workbench-v3')
    expect(deskStyles).toContain('.desk-page::before')
    expect(deskStyles).toContain('grid-template-columns: 238px minmax(0, 1fr)')
  })
})
