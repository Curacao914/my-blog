const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')

describe('homepage revolution', () => {
  it('rebuilds the homepage as a system gateway instead of a card wall', () => {
    expect(home).toContain('home-revolution-v2')
    expect(home).toContain('home-system-hero')
    expect(home).toContain('home-command-search')
    expect(home).toContain('home-operating-board')
    expect(home).not.toContain('home-dashboard')
    expect(home).not.toContain('home-feature')
    expect(home).not.toContain('home-topic-card')
  })

  it('keeps the homepage focused on explicit system entries', () => {
    expect(home).toContain('法学、写作、课程与工具的个人工作系统')
    expect(home).toContain("<HomeEntry href='/content'")
    expect(home).toContain("<HomeEntry href='/search'")
    expect(home).toContain("<HomeEntry href='/tools'")
    expect(home).toContain("<HomeEntry href='/desk'")
  })

  it('uses text routes and recent lines instead of generated topic covers', () => {
    expect(home).toContain('home-topic-path')
    expect(home).toContain('home-recent-line')
    expect(home).not.toContain('publicContentStableHue')
    expect(home).not.toContain('generated-cover')
    expect(home).not.toContain('home-feature-cover')
  })
})
