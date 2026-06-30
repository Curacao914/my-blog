const fs = require('fs')
const path = require('path')

const read = file =>
  fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('reading library UI', () => {
  const reading = read('components/ReadingBox.js')
  const styles = read('components/LawTechDeskStyles.js')

  it('opens with folders and keeps real document actions', () => {
    expect(reading).toContain('阅读资料库')
    expect(reading).toContain('reading-folder-strip')
    expect(reading).toContain('新建文件夹')
    expect(reading).toContain('复制文件夹')
    expect(reading).toContain('所在文件夹')
    expect(reading).toContain('归档')
    expect(reading).toContain('MarkdownDocument')
    expect(reading).toContain('存为笔记草稿')
  })

  it('uses responsive folder cards that match the workbench', () => {
    expect(styles).toContain('.reading-folder-strip')
    expect(styles).toContain('.reading-folder-card')
    expect(styles).toContain('.reading-library-head')
  })
})
