import fs from 'node:fs'
import path from 'node:path'

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('round 9 pre-PR UI cleanup', () => {
  const css = read('styles/lawtech-system.css')
  const manager = read('components/law-tech/SystemWindowManager.js')
  const header = read('components/law-tech/PublicHeader.js')
  const editor = read('components/about/PublicProfileEditor.js')

  test('keeps the titlebar above the content without a displaced seam', () => {
    expect(css).toContain('.home-app-titlebar-v7::before')
    expect(css).toContain('filter: none !important')
    expect(css).toContain('z-index: 40 !important')
  })

  test('uses a compact Dock shelf instead of the old full-screen board', () => {
    expect(manager).toContain("className='system-window-shelf-layer'")
    expect(manager).toContain("className='system-window-shelf'")
    expect(manager).not.toContain("className='system-mission-control'")
  })

  test('removes the clipped number badge from the Dock markup', () => {
    expect(header).toContain("'has-windows'")
    expect(header).not.toContain("<b className='system-dock-window-count'>")
  })

  test('keeps homepage settings free of explanatory imitation copy', () => {
    expect(editor).not.toContain('像微信状态一样')
    expect(editor).not.toContain('随时在这里修改')
  })
})
