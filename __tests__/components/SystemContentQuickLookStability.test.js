import fs from 'node:fs'
import path from 'node:path'

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('content and Quick Look stabilization', () => {
  const header = read('components/law-tech/PublicHeader.js')
  const manager = read('components/law-tech/SystemWindowManager.js')
  const home = read('pages/index.js')
  const styles = read('styles/lawtech-system.css')

  test('uses the requested search wording and a centered menu', () => {
    expect(header).toContain("placeholder='搜索标题、内容或标签'")
    expect(header).toContain("className='system-menu-trailing'")
    expect(styles).toContain('left: 50% !important')
    expect(styles).toContain('transform: translate(-50%, -50%) !important')
  })

  test('reopens an application when its route is activated', () => {
    expect(manager).toContain("status: 'open'")
    expect(manager).toContain('[ready, router.asPath, router.pathname]')
  })

  test('recognizes only explicit Quick Look surfaces', () => {
    expect(manager).toContain("node.closest('[data-quicklook]:not([data-quicklook=\"false\"])')")
    expect(manager).toContain("document.addEventListener('focusin'")
    expect(home).toContain('data-quicklook')
    expect(styles).toContain("content: '空格预览'")
  })

  test('pins the local runtime used for final verification', () => {
    expect(read('.nvmrc').trim()).toBe('22')
  })
})
