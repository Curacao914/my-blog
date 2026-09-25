const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')

describe('content-first homepage', () => {
  it('keeps one real content workspace and direct destinations', () => {
    expect(home).toContain('home-desktop-grid-v7')
    expect(home).toContain('LibraryWindow')
    expect(home).toContain('SpacesWindow')
    expect(home).toContain('ChronicleWindow')
    expect(home).toContain("href='/search'")
    expect(home).toContain("href='/content'")
  })

  it('does not advertise unfinished tools or explain the interface', () => {
    expect(home).not.toContain('home-studio-roadmap')
    expect(home).not.toContain("state: '计划'")
    expect(home).not.toContain('共享标签只在确有关系时连接')
  })

  it('keeps real content covers and useful empty states', () => {
    expect(home).toContain('ContentCover')
    expect(home).toContain("item.cover")
    expect(home).toContain('暂无内容')
  })
})
