const fs = require('fs')
const path = require('path')

describe('Today card outer-grid contract', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'components/LawTechDeskStyles.js'), 'utf8')
  const component = fs.readFileSync(path.join(process.cwd(), 'components/TodayBoard.js'), 'utf8')

  it('keeps the checkbox column only when a checkbox is rendered', () => {
    expect(css).toMatch(/\.today-card\s*{[^}]*grid-template-columns:\s*28px\s+minmax\(0,\s*1fr\)/s)
    expect(component).toContain("canComplete ? 'has-check' : 'no-check'")
    expect(css).toMatch(/\.today-card\.no-check\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s)
  })

  it('does not mask the bug with vertical text or min-content sizing', () => {
    expect(css).not.toMatch(/writing-mode:\s*vertical/)
    expect(css).not.toMatch(/inline-size:\s*min-content/)
  })
})
