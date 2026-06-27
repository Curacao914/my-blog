const fs = require('fs')
const path = require('path')

describe('course final note reading view', () => {
  const component = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseTextPackDesk.js'),
    'utf8'
  )
  const css = fs.readFileSync(
    path.join(process.cwd(), 'components/LawTechDeskStyles.js'),
    'utf8'
  )

  it('renders Markdown and shows a restrained character count', () => {
    expect(component).toContain("import ReactMarkdown from 'react-markdown'")
    expect(component).toContain("className='course-final-preview'")
    expect(component).toContain("className='course-final-count'")
    expect(component).toContain('确认无误，完成本课')
  })

  it('keeps the reading surface scrollable without crowding the page', () => {
    expect(css).toMatch(
      /\.course-final-preview,[\s\S]*?max-height:\s*min\(68vh,760px\);[\s\S]*?overflow:\s*auto/
    )
  })
})
