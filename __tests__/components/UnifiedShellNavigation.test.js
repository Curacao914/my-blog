const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const navigation = fs.readFileSync(path.join(root, 'lib/domain/navigation.js'), 'utf8')
const deskShell = fs.readFileSync(path.join(root, 'components/DeskShell.js'), 'utf8')
const publicHeader = fs.readFileSync(path.join(root, 'components/law-tech/PublicHeader.js'), 'utf8')

describe('unified shell navigation', () => {
  it('retains every public and private destination', () => {
    for (const href of [
      '/content', '/search', '/tools', '/about', '/desk',
      '/desk/today', '/desk/tasks', '/desk/inbox', '/desk/reading',
      '/desk/materials', '/desk/courses', '/desk/writing',
      '/desk/publish', '/desk/system'
    ]) {
      expect(navigation + publicHeader).toContain(`href: '${href}'`)
    }
  })

  it('groups desk routes by user task while keeping permission filtering', () => {
    for (const group of ['安排', '阅读与知识', '创作', '管理']) {
      expect(navigation).toContain(`group: '${group}'`)
    }
    expect(deskShell).toContain('NAV_PERMISSION')
    expect(deskShell).toContain("profile?.permissions?.[NAV_PERMISSION[item.key]]")
  })

  it('keeps mobile navigation reversible and stateful', () => {
    expect(deskShell).toContain("aria-label='工作台导航'")
    expect(deskShell).toContain("aria-label='打开工作台导航'")
    expect(deskShell).toContain('aria-expanded={mobileOpen}')
    expect(deskShell).toContain("event.key === 'Escape'")
    expect(deskShell).toContain("aria-current={active === item.key ? 'page' : undefined}")
  })
})
