const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('homepage cards and writing autosave race guard', () => {
  const home = read('pages/index.js')
  const writing = read('components/WritingDesk.js')

  it('keeps homepage cover cards on the shared system stylesheet contract', () => {
    const systemStyles = read('styles/lawtech-system.css')

    expect(home).toContain('function ContentCover')
    expect(home).toContain('home-stack-card-v6')
    expect(home).toContain('home-library-recent')
    expect(systemStyles).toContain('.home-stack-card-v6')
    expect(systemStyles).toContain('.home-library-recent')
  })

  it('does not let an older save response restore deleted title text', () => {
    expect(writing).toContain('editRevisionRef')
    expect(writing).toContain('editRevisionRef.current === saveRevision')
    expect(writing).toContain('pendingSaveRef.current')
    expect(writing).not.toContain('setTitle(saved.title || title)')
  })
})
