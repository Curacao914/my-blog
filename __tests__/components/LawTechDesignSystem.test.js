const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('law-tech visual system', () => {
  it('keeps the desk shell compact, collapsible and icon-led', () => {
    const shell = read('components/DeskShell.js')
    expect(shell).toContain('desk-sidebar-collapsed')
    expect(shell).toContain('desk-collapse-button')
    expect(shell).toContain('<LawTechIcon name={item.key}')
  })

  it('keeps course editing in a single-screen tabbed workbench', () => {
    const course = read('components/CourseTextPackDesk.js')
    const css = read('components/LawTechDeskStyles.js')
    expect(course).toContain("['draft', '正文']")
    expect(course).toContain("['review',")
    expect(course).toContain("['source', '来源']")
    expect(css).toMatch(/\.course-detail-shell\s*\{[\s\S]*?height:\s*100%/)
    expect(css).toMatch(/\.course-editor-pane\s*\{[\s\S]*?overflow:\s*hidden/)
  })

  it('uses the warm glass language while keeping the homepage content-led', () => {
    const home = read('pages/index.js')
    const header = read('components/law-tech/PublicHeader.js')
    const css = read('components/LawTechDeskStyles.js')
    expect(home).toContain('home-workspace')
    expect(home).toContain('home-library-recent')
    expect(home).toContain("href='/content'")
    expect(home).not.toContain('public-portrait-card')
    expect(home).not.toContain('public-entry-grid')
    expect(header).toContain('public-header-actions')
    expect(css).toContain('backdrop-filter: blur(24px)')
    expect(css).toContain('--display-serif')
  })
})
