const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

describe('home widget customization and timed reading pool', () => {
  test('keeps Dock random navigation click-driven', () => {
    const header = read('components/law-tech/PublicHeader.js')
    expect(header).toContain('window.location.assign(next)')
    expect(header).toContain("system-dock-tooltip'>随机一页")
    expect(header).not.toContain('lawtech-random-dock-v2')
    expect(header).not.toContain('每 6 小时更新')
  })

  test('changes only part of the Reading pool on a timed local cache', () => {
    const home = read('pages/index.js')
    expect(home).toContain("lawtech-home-reading-stack-v1")
    expect(home).toContain('const keepCount = Math.max(0, Math.min(count - 2, validKeys.length))')
    expect(home).toContain('window.localStorage.setItem(READING_STACK_CACHE_KEY')
    expect(home).toContain('refreshHours')
    expect(home).not.toContain("<nav aria-label='切换文章'>")
  })

  test('exposes homepage status and widget settings in the owner settings page', () => {
    const profile = read('lib/siteProfile.js')
    const editor = read('components/about/PublicProfileEditor.js')
    const desk = read('components/SystemDesk.js')
    expect(profile).toContain('home: {')
    expect(profile).toContain('reading: {')
    expect(profile).toContain('status: {')
    expect(editor).toContain('<legend>首页状态</legend>')
    expect(editor).toContain('<legend>文章轮播</legend>')
    expect(editor).toContain('<legend>首页组件</legend>')
    expect(editor).not.toContain('像微信状态一样')
    expect(desk).toContain("{ key: 'public-profile', label: '首页' }")
  })

  test('renders the status as a compact state card and removes carousel dots', () => {
    const home = read('pages/index.js')
    const styles = read('styles/lawtech-system.css')
    expect(home).toContain('home-status-widget')
    expect(home).toContain('home-status-emoji')
    expect(styles).toContain('.home-smart-stack-v7 > nav')
    expect(styles).toContain('display: none !important')
  })
})
