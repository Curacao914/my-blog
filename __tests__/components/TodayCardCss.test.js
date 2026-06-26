const fs = require('fs')
const path = require('path')

describe('Today card CSS layout contract', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'components/LawTechDeskStyles.js'), 'utf8')

  it('uses an explicit content plus optional actions layout', () => {
    expect(css).toContain('.today-card-layout')
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) auto')
    expect(css).toContain('.today-card-content')
    expect(css).toContain('width: 100%')
  })

  it('does not override focus card head into a separate grid that can shrink content', () => {
    expect(css).not.toMatch(/\\.focus-card\\s+\\.today-card-head\\s*{[^}]*display:\\s*grid/s)
    expect(css).not.toMatch(/inline-size:\\s*min-content/)
    expect(css).not.toMatch(/width:\\s*fit-content[^;]*;[^}]*card-title-button/s)
  })
})
