const fs = require('fs')
const path = require('path')

function read(relative) {
  return fs.readFileSync(path.join(process.cwd(), relative), 'utf8')
}

describe('system window interactions', () => {
  test('wraps system pages in a shared window provider', () => {
    const app = read('pages/_app.js')
    expect(app).toContain('SystemWindowProvider')
    expect(app).toContain('<SystemWindowProvider>{clerkContent}</SystemWindowProvider>')
  })

  test('turns the traffic lights into real close, minimize and focus controls', () => {
    const manager = read('components/law-tech/SystemWindowManager.js')
    const home = read('pages/index.js')
    const desk = read('components/DeskShell.js')
    expect(manager).toContain("aria-label='关闭窗口'")
    expect(manager).toContain("aria-label='最小化到程序坞'")
    expect(manager).toContain("aria-haspopup='menu'")
    expect(manager).toContain('controller.toggleFocus()')
    expect(manager).toContain("choose('left')")
    expect(manager).toContain("choose('right')")
    expect(manager).toContain("className='system-window-layout-layer'")
    expect(manager).toContain('document.body')
    expect(home).toContain('<SystemWindowControls controller={windowController} />')
    expect(desk).toContain('<SystemWindowControls controller={windowController} />')
  })

  test('keeps window state in-session and restores it from the Dock overview', () => {
    const manager = read('components/law-tech/SystemWindowManager.js')
    const header = read('components/law-tech/PublicHeader.js')
    expect(manager).toContain("lawtech-system-windows-v1")
    expect(manager).toContain('window.sessionStorage')
    expect(manager).toContain('窗口总览')
    expect(header).toContain('openMissionControl')
    expect(header).toContain('restoreCurrent')
  })

  test('uses Space only for Quick Look and does not add a shortcut collection', () => {
    const manager = read('components/law-tech/SystemWindowManager.js')
    expect(manager).toContain("event.code !== 'Space'")
    expect(manager).toContain('candidateFromNode')
    expect(manager).toContain('Quick Look')
    expect(manager).not.toContain("event.key === 'm'")
    expect(manager).not.toContain("event.key === 'w'")
  })
})
