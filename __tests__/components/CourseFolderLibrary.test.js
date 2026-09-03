const fs = require('fs')
const path = require('path')

describe('course folder library', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseTextPackDesk.js'),
    'utf8'
  )
  const styles = fs.readFileSync(
    path.join(process.cwd(), 'components/LawTechDeskStyles.js'),
    'utf8'
  )

  it('groups the course library into folders', () => {
    expect(source).toContain('function CourseFolderLibrary')
    expect(source).toContain('课程文件夹')
    expect(source).toContain('course-folder-grid')
    expect(source).toContain('搜索课程')
  })

  it('uses folder cards matching the workbench visual system', () => {
    expect(styles).toContain('.course-folder-card')
    expect(styles).toContain('.course-library-breadcrumbs')
  })
})
