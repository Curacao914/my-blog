const fs = require('fs')
const path = require('path')

describe('course brief reader', () => {
  const component = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseBriefReader.js'),
    'utf8'
  )
  const page = fs.readFileSync(
    path.join(process.cwd(), 'pages/desk/briefs/[jobId]/[lessonKey].js'),
    'utf8'
  )
  const api = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/courses/briefs/read.js'),
    'utf8'
  )

  it('provides a dedicated readable page and explicit read toggle', () => {
    expect(page).toContain('<CourseBriefReader')
    expect(component).toContain('标记为读过')
    expect(component).toContain('恢复未读')
    expect(component).toContain('MarkdownDocument')
    expect(component).toContain('ReadingNavigator')
  })

  it('stores read state only through the authenticated course API', () => {
    expect(api).toContain('requireCourseWorkspace')
    expect(api).toContain('setCourseBriefRead')
    expect(api).toContain("['GET', 'POST']")
  })
})
