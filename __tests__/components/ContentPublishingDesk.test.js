const fs = require('fs')
const path = require('path')

describe('course publishing UI', () => {
  const desk = fs.readFileSync(
    path.join(process.cwd(), 'components/ContentPublishingDesk.js'),
    'utf8'
  )
  const course = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseTextPackDesk.js'),
    'utf8'
  )
  const publicIndex = fs.readFileSync(
    path.join(process.cwd(), 'pages/content/index.js'),
    'utf8'
  )

  it('provides draft, preview, publish, update, and withdraw controls', () => {
    expect(desk).toContain('保存草稿')
    expect(desk).toContain('更新发布版本')
    expect(desk).toContain('撤回')
    expect(desk).toContain('ReactMarkdown')
  })

  it('links completed course notes into the publishing desk', () => {
    expect(course).toContain('转入发布')
    expect(course).toContain('/desk/publish?job=')
  })

  it('renders public content by collection instead of one flat list', () => {
    expect(publicIndex).toContain('groupContentByCollection')
    expect(publicIndex).toContain('collection-group')
  })
})
