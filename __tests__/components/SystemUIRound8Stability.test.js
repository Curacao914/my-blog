const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('system UI round 8 stability fixes', () => {
  const header = read('components/law-tech/PublicHeader.js')
  const about = read('pages/about/index.js')
  const home = read('pages/index.js')
  const styles = read('styles/lawtech-system.css')

  test('keeps owner-only navigation hydration stable', () => {
    expect(header).toContain('ownerNavigation = false')
    expect(header).toContain('mounted && Boolean(session?.isOwner)')
    expect(about).toContain("<PublicHeader active='about' ownerNavigation />")
  })

  test('keeps a quote stable for the configured interval across remounts', () => {
    expect(home).toContain("lawtech-home-quote-v1")
    expect(home).toContain('Number(settings.refreshHours) || 6')
    expect(home).toContain('refreshHours * 60 * 60 * 1000')
    expect(home).toContain("refresh({ force: true })")
  })

  test('uses a genuinely neutral wallpaper and normal profile scale', () => {
    expect(styles).toContain('Round 8.1 — neutral glass')
    expect(styles).toContain('--system-wallpaper-v81')
    expect(styles).toContain('rgba(222, 232, 229, .22)')
    expect(styles).toContain('font-size: clamp(22px, 2.2vw, 30px)')
    expect(styles).toContain('min-height: 132px')
  })

  test('stabilizes the two independent settings scroll owners', () => {
    expect(styles).toContain('.desk-app-window .desk-page:has(.settings-layout)')
    expect(styles).toContain('grid-template-rows: auto minmax(0, 1fr)')
    expect(styles).toContain('grid-template-columns: minmax(168px, 194px) minmax(0, 1fr)')
  })
})
