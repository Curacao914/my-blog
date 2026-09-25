const fs = require('fs')
const path = require('path')

const styles = fs.readFileSync(
  path.join(__dirname, '../../styles/lawtech-system.css'),
  'utf8'
)

describe('Apple liquid glass visual system', () => {
  it('removes the dark editorial override and asymmetric geometry', () => {
    expect(styles).not.toContain('Editorial workspace recomposition v9')
    expect(styles).not.toContain('v9 final cascade')
    expect(styles).not.toMatch(/border-radius:\s*3px\s+2[24]px\s+3px\s+2[24]px/)
    expect(styles).not.toContain('background:#1d4638 !important')
    expect(styles).not.toContain('background: #204b3d !important')
  })

  it('defines one neutral liquid-glass material hierarchy', () => {
    expect(styles).toContain('Apple liquid glass visual system v11')
    expect(styles).toContain('--apple-glass-chrome: rgba(248, 250, 251, .66)')
    expect(styles).toContain('--apple-glass-content: rgba(252, 252, 250, .88)')
    expect(styles).toContain('--apple-glass-stroke: rgba(255, 255, 255, .82)')
    expect(styles).toContain('backdrop-filter: blur(24px) saturate(155%)')
  })

  it('keeps the signature unframed and the desk chrome light', () => {
    expect(styles).toContain('.home-signature-widget-v7 {')
    expect(styles).toContain('background: transparent !important')
    expect(styles).toContain('border: 0 !important')
    expect(styles).toContain('box-shadow: none !important')
    expect(styles).toContain('.desk-app-titlebar {')
    expect(styles).toContain('color: var(--apple-ink) !important')
    expect(styles).toContain('background: var(--apple-glass-chrome) !important')
  })
})
