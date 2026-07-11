const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('system UI round 8 visual polish', () => {
  const styles = read('styles/lawtech-system.css')

  test('uses a neutral optical glass material instead of a green wash', () => {
    expect(styles).toContain('Round 8 — neutral optical glass')
    expect(styles).toContain('--system-wallpaper-v8')
    expect(styles).toContain("filter: url('#lawtech-glass-wide') saturate(1.04)")
    expect(styles).toContain('rgba(255,255,255,.07)')
  })

  test('keeps settings navigation and detail pane as independent scroll owners', () => {
    expect(styles).toContain('.desk-app-window .desk-page-system .settings-nav')
    expect(styles).toContain('.desk-app-window .desk-page-system .settings-content')
    expect(styles).toContain('overflow-y: auto !important')
    expect(styles).toContain('grid-template-columns: minmax(170px, 194px) minmax(0, 1fr)')
  })

  test('uses oversized cropped institutional marks in Education cards', () => {
    expect(styles).toContain('.about-school-mark')
    expect(styles).toContain('height: 220% !important')
    expect(styles).toContain('min-height: 158px')
    expect(styles).toContain('--edu-accent')
  })
})
