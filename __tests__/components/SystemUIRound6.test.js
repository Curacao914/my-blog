const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const home = read('pages/index.js')
const header = read('components/law-tech/PublicHeader.js')
const signal = read('components/law-tech/PublicHeaderSignal.js')
const filters = read('components/law-tech/LiquidGlassFilters.js')
const quoteApi = read('pages/api/quote.js')
const styles = read('styles/lawtech-system.css')

describe('system UI round 6 compatibility', () => {
  it('moves application switching into the window title bar', () => {
    expect(home).toContain('home-window-switcher')
    expect(home).not.toContain('function AppRail')
    expect(home).not.toContain("className='home-app-rail'")
  })

  it('uses a timed single-card landscape reading stack', () => {
    expect(home).toContain('home-stack-viewport')
    expect(home).toContain('timedReadingSelection')
    expect(home).toContain("className='home-stack-card-v6 is-current'")
    expect(home).toContain('window.setInterval')
    expect(styles).toContain('.home-stack-card-v6.is-current')
    expect(styles).toContain('.home-stack-copy-v10')
  })

  it('keeps cached remote quotes only in the dedicated widget', () => {
    expect(home).toContain('function QuoteWidget')
    expect(signal).not.toContain("fetch('/api/quote'")
    expect(signal).not.toContain('<small')
    expect(quoteApi).toContain('https://v1.hitokoto.cn/')
    expect(quoteApi).toContain('LOCAL_QUOTES')
    expect(quoteApi).toContain('CACHE_MS')
  })

  it('uses precomputed squircle displacement maps for optical rims', () => {
    expect(header).toContain('LiquidGlassFilters')
    expect(filters).toContain('feDisplacementMap')
    expect(filters).toContain("id='lawtech-glass-wide'")
    expect(filters).toContain('data:image/png;base64')
    expect(styles).toContain("filter: url('#lawtech-glass-wide')")
    expect(styles).toContain("filter: url('#lawtech-glass-medium')")
  })
})
