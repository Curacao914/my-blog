const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const styles = fs.readFileSync(path.join(root, 'styles/lawtech-system.css'), 'utf8')

describe('unified frontend foundation', () => {
  it('defines scoped surface, focus and press contracts', () => {
    expect(styles).toContain('--surface-solid:')
    expect(styles).toContain('--surface-glass:')
    expect(styles).toContain('--focus-ring:')
    expect(styles).toMatch(/\.lawtech-public-page[^\n]*:focus-visible|\.system-desktop[^\n]*:focus-visible|\.desk-system-scene[^\n]*:focus-visible/)
    expect(styles).toMatch(/\.lawtech-public-page[^\n]*:active|\.system-desktop[^\n]*:active|\.desk-system-scene[^\n]*:active/)
  })

  it('provides motion, transparency and contrast alternatives', () => {
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('@media (prefers-reduced-transparency: reduce)')
    expect(styles).toContain('@media (prefers-contrast: more)')
  })

  it('keeps the unified rules inside law-tech surfaces', () => {
    expect(styles).toContain(':where(.lawtech-public-page, .system-desktop, .desk-system-scene)')
    expect(styles).not.toMatch(/\nbutton:active\s*\{/)
    expect(styles).not.toMatch(/\na:focus-visible\s*\{/)
  })
})
