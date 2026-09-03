const fs = require('fs')
const path = require('path')

describe('desk density and overflow guardrails', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'components/LawTechDeskStyles.js'),
    'utf8'
  )
  const course = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseTextPackDesk.js'),
    'utf8'
  )

  it('keeps the course import steps readable and fully visible', () => {
    expect(css).toMatch(
      /\.course-import-steps\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s
    )
    expect(css).toMatch(
      /\.course-import-steps button\s*\{[^}]*min-height:\s*34px;[^}]*white-space:\s*nowrap/s
    )
  })

  it('prevents the desktop sidebar navigation from scrolling sideways', () => {
    expect(css).toMatch(
      /\.desk-nav\s*\{[^}]*overflow-y:\s*auto;[^}]*overflow-x:\s*hidden/s
    )
  })

  it('uses restrained product-page typography', () => {
    expect(css).toMatch(
      /\.desk-product-copy h2\s*\{[^}]*font-size:\s*clamp\(26px,\s*2\.8vw,\s*36px\)/s
    )
  })

  it('does not show implementation-oriented import copy', () => {
    expect(course).not.toContain(
      '普通资料在浏览器读取；扫描资料在线识别后只保存文字。'
    )
  })
})
