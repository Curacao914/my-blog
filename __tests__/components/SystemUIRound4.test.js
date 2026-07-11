const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const app = read('pages/_app.js')
const home = read('pages/index.js')
const content = read('pages/content/index.js')
const detail = read('pages/content/[...slug].js')
const search = read('pages/search/index.js')
const directory = read('components/content/PublicDirectoryPage.js')
const desk = read('components/DeskShell.js')
const styles = read('styles/lawtech-system.css')

describe('system UI round 4', () => {
  it('loads the system design layer once from _app', () => {
    expect(app).toContain("import '@/styles/lawtech-system.css'")
  })

  it('places shared system chrome outside every public application window', () => {
    for (const source of [content, detail, search, directory]) {
      expect(source.indexOf('<PublicHeader')).toBeGreaterThan(-1)
      expect(source.indexOf("className='public-shell")).toBeGreaterThan(-1)
      expect(source.indexOf('<PublicHeader')).toBeLessThan(source.indexOf("className='public-shell"))
      expect(source).not.toContain('LawTechDeskStyles')
      expect(source).toContain('data-system-app=')
    }
  })

  it('runs the private workspace inside the same Menu Bar and Dock', () => {
    expect(desk).toContain("<PublicHeader active='desk'")
    expect(desk).toContain('desk-app-window')
    expect(desk).toContain("className='desk-app-titlebar'")
    expect(desk).toContain('<SystemWindowControls controller={windowController} />')
  })

  it('removes the continuous full-screen pointer light from Home Desktop', () => {
    expect(home).not.toContain('moveDesktopLight')
    expect(home).not.toContain('onPointerMove={moveDesktopLight}')
    expect(styles).toContain('.home-wallpaper-light')
    expect(styles).toContain('animation: none !important')
  })

  it('separates glass navigation from readable content surfaces', () => {
    expect(styles).toContain('Liquid Glass primitives')
    expect(styles).toContain('Keep content surfaces solid and readable')
    expect(styles).toContain('backdrop-filter: none !important')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('@media (prefers-reduced-transparency: reduce)')
  })

  it('prevents the content app from expanding beyond the viewport', () => {
    expect(styles).toContain('max-width: calc(100vw - 44px)')
    expect(styles).toContain('overflow-x: clip')
    expect(styles).toContain('min-width: 0')
  })
})
