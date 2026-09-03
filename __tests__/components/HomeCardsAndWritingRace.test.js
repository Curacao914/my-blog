const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('homepage cards and writing autosave race guard', () => {
  const home = read('pages/index.js')
  const writing = read('components/WritingDesk.js')

  it('lets homepage styles reach extracted card components', () => {
    expect(home).toContain('<style jsx global>')
    expect(home).toContain('home-feature-cover')
    expect(home).toContain('home-content-row')
  })

  it('does not let an older save response restore deleted title text', () => {
    expect(writing).toContain('editRevisionRef')
    expect(writing).toContain('editRevisionRef.current === saveRevision')
    expect(writing).toContain('pendingSaveRef.current')
    expect(writing).not.toContain('setTitle(saved.title || title)')
  })
})
