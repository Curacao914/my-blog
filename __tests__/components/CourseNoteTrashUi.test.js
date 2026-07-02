const fs = require('fs')
const path = require('path')

describe('lesson note trash UI', () => {
  const library = fs.readFileSync(path.join(process.cwd(), 'components/CourseNotesLibrary.js'), 'utf8')
  const workbench = fs.readFileSync(path.join(process.cwd(), 'components/CourseTextPackDesk.js'), 'utf8')

  it('offers trash, restore, and guarded permanent deletion', () => {
    expect(library).toContain('移入回收站')
    expect(library).toContain('恢复')
    expect(library).toContain('永久删除')
    expect(library).toContain("'trash-lesson-note'")
    expect(library).toContain("'restore-lesson-note'")
    expect(library).toContain("'purge-lesson-note'")
    expect(library).toContain("confirmation !== '永久删除'")
  })

  it('keeps regeneration separate and explicit', () => {
    expect(workbench).toContain("'regenerate-lesson-note'")
    expect(workbench).toContain('重新生成笔记')
    expect(workbench).toContain("confirmation !== '永久删除'")
  })
})
