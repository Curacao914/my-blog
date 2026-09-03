const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('reading library v2', () => {
  const reading = read('components/ReadingBox.js')
  const dialog = read('components/ReadingLibraryDialog.js')
  const styles = read('components/LawTechDeskStyles.js')

  it('uses an in-page dialog and never native prompt or confirm', () => {
    expect(reading).toContain('ReadingLibraryDialog')
    expect(reading).not.toContain('window.prompt')
    expect(reading).not.toContain('window.confirm')
    expect(dialog).toContain("role='dialog'")
  })

  it('shows root folders without auto-opening the first article', () => {
    expect(reading).toContain("if (!archivedMode && !activeFolderId) return []")
    expect(reading).toContain("const activeItem = readingItems.find")
    expect(reading).not.toContain('visibleItems[0]')
  })

  it('keeps management in an ellipsis menu and restores page scrolling', () => {
    expect(reading).toContain('reading-more-button')
    expect(reading).toContain('移出日常阅读')
    expect(styles).toContain('.desk-page-reading .desk-page-content { overflow:auto; }')
    expect(styles).toContain('.reading-action-popover')
  })
})
