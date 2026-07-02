const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('reading library UI', () => {
  const reading = read('components/ReadingBox.js')
  const styles = read('components/LawTechDeskStyles.js')

  it('opens with folders, then opens an article only after a click', () => {
    expect(reading).toContain('阅读资料库')
    expect(reading).toContain('reading-folder-strip')
    expect(reading).toContain('新建文件夹')
    expect(reading).toContain('const activeItem = readingItems.find')
    expect(reading).not.toContain('visibleItems[0]')
  })

  it('keeps document management in a quiet ellipsis menu', () => {
    expect(reading).toContain('reading-more-button')
    expect(reading).toContain('移动到…')
    expect(reading).toContain('移出日常阅读')
    expect(reading).toContain('资料归档')
    expect(styles).toContain('.reading-action-popover')
  })
})
