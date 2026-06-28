const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('homepage and writing studio polish', () => {
  const home = read('pages/index.js')
  const header = read('components/law-tech/PublicHeader.js')
  const writing = read('components/WritingDesk.js')
  const tools = read('pages/tools/index.js')

  it('uses the homepage for content, search and working links instead of a poster composition', () => {
    expect(home).toContain('home-command')
    expect(home).toContain('home-updates-grid')
    expect(home).toContain('home-category-grid')
    expect(home).toContain('Writing Studio')
    expect(home).not.toContain('public-portrait-card')
    expect(home).not.toContain('public-entry-grid')
    expect(home).not.toContain('这里放写完的东西')
    expect(home).not.toContain('Library map')
  })

  it('keeps the public header balanced and groups account actions together', () => {
    expect(header).toContain('grid-template-columns: minmax(170px, 1fr) auto minmax(170px, 1fr)')
    expect(header).toContain('public-header-actions')
    expect(header).toContain('AdminContentSync')
    expect(header).toContain('WorkspaceAccountMenu')
  })

  it('ships an editable Markdown writing surface with preview and autosave', () => {
    expect(writing).toContain('writing-studio-editor')
    expect(writing).toContain('MarkdownDocument')
    expect(writing).toContain('1100')
    expect(writing).toContain("event.key.toLowerCase() === 's'")
    expect(writing).toContain('发布设置')
  })

  it('keeps public tool copy functional and short', () => {
    expect(tools).toContain('<h1>工具</h1>')
    expect(tools).not.toContain('不做工具箱大全')
    expect(tools).not.toContain('少而顺手的小工具')
  })
})
