import fs from 'node:fs'
import path from 'node:path'

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('final PR stability', () => {
  const home = read('pages/index.js')
  const manager = read('components/law-tech/SystemWindowManager.js')
  const header = read('components/law-tech/PublicHeader.js')
  const styles = read('styles/lawtech-system.css')

  test('keeps Reading usable with stale cache data, broken covers, and the continuous track', () => {
    expect(home).toContain('version: 2')
    expect(home).toContain('function readingUsableItem')
    expect(home).toContain("className='home-stack-fallback-v10'")
    expect(home).toContain(
      'const safeActive = total ? slideIndex % total : 0'
    )
    expect(home).toContain('const trackItems = total > 1')
    expect(home).toContain('home-stack-track-v11')
    expect(styles).toContain('.home-stack-track-v11')
    expect(styles).toContain('.home-stack-card-v6.is-current')
  })

  test('uses one non-overlapping menu layout everywhere', () => {
    expect(header).toContain('搜索标题、内容或标签')
    expect(styles).toContain('position: absolute !important')
    expect(styles).toContain('transform: translate(-50%, -50%) !important')
    expect(styles).toContain('width: min(45vw, 570px) !important')
  })

  test('keeps Quick Look opt-in and excludes general navigation links', () => {
    expect(manager).toContain("node.closest('[data-quicklook]:not([data-quicklook=\"false\"])')")
    expect(home).toContain('data-quicklook')
    expect(styles).toContain('.home-library-recent a:not([data-quicklook])::after')
  })
})
