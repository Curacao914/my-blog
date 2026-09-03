import fs from 'node:fs'
import path from 'node:path'

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('consolidated pre-PR system contract', () => {
  const manager = read('components/law-tech/SystemWindowManager.js')
  const home = read('pages/index.js')
  const header = read('components/law-tech/PublicHeader.js')
  const card = read('components/content/PublicContentCard.js')
  const styles = read('styles/lawtech-system.css')

  test('uses a real public title bar instead of the old pseudo title bar', () => {
    expect(manager).toContain("node.className = 'system-public-window-titlebar-mount'")
    expect(manager).toContain("className='system-public-window-titlebar'")
    expect(styles).toContain('.lawtech-public-page > .public-shell::before')
    expect(styles).toContain('display: none !important')
  })

  test('renders one complete Reading card at a time', () => {
    expect(home).toContain("className='home-stack-card-v6 is-current'")
    expect(home).not.toContain('className={`home-stack-card-v6 is-${position}`}')
    expect(styles).toContain('@keyframes home-reading-enter')
  })

  test('keeps Quick Look explicit', () => {
    expect(manager).toContain("node.closest('[data-quicklook]:not([data-quicklook=\"false\"])')")
    expect(card).toContain('data-quicklook')
    expect(header).not.toContain('data-quicklook')
  })

  test('keeps About owner-only and centers navigation independently', () => {
    expect(header).toContain("MENU_ITEMS.filter(item => item.key !== 'about' || showAbout)")
    expect(styles).toContain('transform: translate(-50%, -50%) !important')
  })
})
