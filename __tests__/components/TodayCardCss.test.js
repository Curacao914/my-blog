const fs = require('fs')
const path = require('path')

describe('Today card outer-grid contract', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'components/LawTechDeskStyles.js'), 'utf8')
  const component = fs.readFileSync(path.join(process.cwd(), 'components/TodayBoard.js'), 'utf8')

  it('keeps the checkbox conditional and the title plus metadata in one stable content column', () => {
    expect(component).toContain("canComplete ? 'has-check' : 'no-check'")
    expect(component).toContain('data-testid="today-card-layout"')
    expect(component).toContain('data-testid="today-card-content"')
    expect(component).toContain('data-testid="today-card-title"')
    expect(component).toContain('data-testid="today-card-meta"')
    expect(css).toContain('.today-card')
    expect(css).toContain('.today-card.no-check')
  })

  it('does not apply vertical writing or min-content sizing inside a Today card rule', () => {
    expect(css).not.toMatch(/\.today-card[^\{]*\{[^}]*writing-mode:\s*vertical/s)
    expect(css).not.toMatch(/\.today-card[^\{]*\{[^}]*inline-size:\s*min-content/s)
  })
})
