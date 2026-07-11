import fs from 'node:fs'
import path from 'node:path'

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('system floating layer contract', () => {
  const manager = read('components/law-tech/SystemWindowManager.js')
  const styles = read('styles/lawtech-system.css')

  test('renders the arrangement menu through a body portal', () => {
    expect(manager).toContain("className='system-window-layout-layer'")
    expect(manager).toContain('document.body')
    expect(manager).toContain('getBoundingClientRect')
    expect(manager).not.toContain(
      "<span className='system-window-layout-menu' role='menu'"
    )
  })

  test('does not use native title tooltips on traffic lights', () => {
    expect(manager).not.toContain("title='关闭窗口'")
    expect(manager).not.toContain("title='最小化到程序坞'")
    expect(manager).not.toContain("title='聚焦窗口；悬停查看排列'")
  })

  test('keeps floating surfaces in an explicit non-overlapping order', () => {
    expect(styles).toContain('.system-window-layout-layer')
    expect(styles).toContain('z-index: 30000 !important')
    expect(styles).toContain('.system-quick-look')
    expect(styles).toContain('z-index: 32000 !important')
    expect(styles).toContain('.system-window-shelf-layer')
    expect(styles).toContain('z-index: 27000 !important')
  })
})
