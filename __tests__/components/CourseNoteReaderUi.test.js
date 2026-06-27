const fs = require('fs')
const path = require('path')

describe('course note library reading experience', () => {
  const library = fs.readFileSync(path.join(process.cwd(), 'components/CourseNotesLibrary.js'), 'utf8')
  const reader = fs.readFileSync(path.join(process.cwd(), 'components/CourseNoteReader.js'), 'utf8')
  const page = fs.readFileSync(path.join(process.cwd(), 'pages/desk/materials/[jobId]/[lessonKey].js'), 'utf8')

  it('opens note cards in a dedicated reader instead of the course workbench', () => {
    expect(library).toContain('/desk/materials/${encodeURIComponent(courseId)}/${encodeURIComponent(lessonKey)}')
    expect(library).toContain("className='note-library-lesson-link'")
    expect(library).not.toContain('阅读 / 修改')
    expect(page).toContain('<CourseNoteReader')
  })

  it('keeps management secondary and the course hierarchy collapsible', () => {
    expect(library).toContain("<details\n          className='note-library-course'")
    expect(library).toContain("<details className='note-library-manage'>")
    expect(library).toContain('编辑原笔记')
    expect(library).toContain('转入发布')
    expect(library).toContain('移入回收站')
  })

  it('provides collapsible course navigation and a live reading navigator', () => {
    expect(reader).toContain("aria-label='课程目录'")
    expect(reader).toContain("aria-label='本文目录'")
    expect(reader).toContain("aria-label='相邻课次'")
    expect(reader).toContain('ReadingNavigator')
    expect(reader).toContain('courseIndexOpen')
    expect(reader).toContain('tocOpen')
    expect(reader).toContain('DynamicSignature')
  })
})
