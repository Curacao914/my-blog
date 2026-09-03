const fs = require('fs')
const path = require('path')

describe('course completion and note library UI', () => {
  const course = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseTextPackDesk.js'),
    'utf8'
  )
  const library = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseNotesLibrary.js'),
    'utf8'
  )
  const navigation = fs.readFileSync(
    path.join(process.cwd(), 'lib/domain/navigation.js'),
    'utf8'
  )

  it('gives the user a final revision action instead of only approval', () => {
    expect(course).toContain('需要修改')
    expect(course).toContain('按要求修改')
    expect(course).toContain("type: 'request-final-revision'")
  })

  it('distinguishes completed courses and supports adding another lesson', () => {
    expect(course).toContain("completed ? '查看笔记'")
    expect(course).toContain('加课次')
    expect(course).toContain('dismissTask(jobId)')
  })

  it('renames the ambiguous materials entry and renders course-to-lesson hierarchy', () => {
    expect(navigation).toContain("label: '笔记库'")
    expect(library).toContain('课程 → 课次')
    expect(library).toContain('noteReaderHref')
    expect(library).toContain('编辑原笔记')
    expect(library).toContain('转入发布')
  })
})
