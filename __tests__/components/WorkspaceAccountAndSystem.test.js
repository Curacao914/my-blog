const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('workspace account and settings surface', () => {
  const menu = read('components/WorkspaceAccountMenu.js')
  const system = read('components/SystemDesk.js')
  const identity = read('components/DeskIdentityCard.js')
  const members = read('components/MemberManagement.js')
  const styles = read('components/LawTechDeskStyles.js')

  it('uses login, permission application and an avatar popover instead of public shortcuts in the desk topbar', () => {
    expect(menu).toContain("href='/sign-in'")
    expect(menu).toContain('注册并申请权限')
    expect(menu).toContain('workspace-account-popover')
    expect(menu).toContain('/api/admin/impersonation')
  })

  it('centralizes personal and owner settings in a compact section layout', () => {
    expect(system).toContain("{ key: 'ai', label: 'AI' }")
    expect(system).toContain("{ key: 'email', label: '邮件发送' }")
    expect(system).toContain("{ key: 'reminders', label: '提醒' }")
    expect(system).toContain("{ key: 'members', label: '成员与权限' }")
    expect(styles).toContain('.settings-layout')
    expect(styles).toContain('.settings-nav')
  })

  it('keeps the identity card useful and readable', () => {
    expect(identity).toContain('看到我记得喝口水')
    expect(identity).toContain('/curacao-avatar.png')
    expect(identity).not.toContain('PERSONAL WORKSPACE')
    expect(identity).not.toContain('天气')
    expect(styles).toContain('grid-template-columns:72px minmax(0,1fr)')
  })

  it('lets the owner edit, delete and immediately view a member identity', () => {
    expect(members).toContain('保存权限')
    expect(members).toContain('删除成员及数据')
    expect(members).toContain('以此身份查看')
  })
})
