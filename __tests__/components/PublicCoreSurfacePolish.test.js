const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const directoryPage = fs.readFileSync(path.join(root, 'components/content/PublicDirectoryPage.js'), 'utf8')
const toolsPage = fs.readFileSync(path.join(root, 'pages/tools/index.js'), 'utf8')
const aboutPage = fs.readFileSync(path.join(root, 'pages/about/index.js'), 'utf8')

describe('public core surface polish', () => {
  it('lightens shared archive category and tag directories', () => {
    expect(directoryPage).toContain('public-directory-surface-v1')
    expect(directoryPage).toContain('padding:46px 0 24px')
    expect(directoryPage).toContain('border-radius:20px')
    expect(directoryPage).toContain('backdrop-filter:blur(14px)')
    expect(directoryPage).toContain('repeat(auto-fit,minmax(230px,1fr))')
    expect(directoryPage).not.toContain('padding:70px 0 34px')
    expect(directoryPage).not.toContain('backdrop-filter:blur(22px)')
  })

  it('adds compact local surfaces for tools and about', () => {
    expect(toolsPage).toContain('tools-app-v2')
    expect(toolsPage).toContain('tools-compact-grid')
    expect(toolsPage).toContain('tools-bottom-bar')
    expect(aboutPage).toContain('about-app-v2')
    expect(aboutPage).toContain('about-profile-head')
    expect(aboutPage).toContain('about-skill-grid')
  })
})
