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
    expect(desk).toContain('MarkdownDocument')
  })

  it('supports reliable editable taxonomy choices, compact tags, and covers', () => {
    expect(desk).toContain('publishing-choice-menu')
    expect(desk).toContain('collectionsByCategory')
    expect(desk).toContain('publishing-tag-menu')
    expect(desk).toContain("placeholder='选择或新建栏目'")
    expect(desk).toContain('封面图片')
    expect(desk).not.toContain('<datalist')
  })

  it('links completed course notes into the publishing desk', () => {
    expect(course).toContain('转入发布')
    expect(course).toContain('/desk/publish?job=')
  })

  it('renders public content through category and collection disclosure levels', () => {
    expect(publicIndex).toContain('groupContentByCollection')
    expect(publicIndex).toContain('content-category')
    expect(publicIndex).toContain('content-collection')
    expect(publicIndex).toContain('generated-cover')
  })
})
