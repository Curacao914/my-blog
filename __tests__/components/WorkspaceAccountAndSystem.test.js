const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('workspace account and settings surface', () => {
  const menu = read('components/WorkspaceAccountMenu.js')
  const shell = read('components/DeskShell.js')
  const sessionHook = read('hooks/useWorkspaceSession.js')
  const app = read('pages/_app.js')
  const system = read('components/SystemDesk.js')
  const account = read('components/AccountSettings.js')
  const profileApi = read('pages/api/account/profile.js')
  const identity = read('components/DeskIdentityCard.js')
  const members = read('components/MemberManagement.js')
  const writing = read('components/WritingDesk.js')
  const styles = read('components/LawTechDeskStyles.js')

  it('uses login, permission application and an avatar popover instead of public shortcuts in the desk topbar', () => {
    expect(menu).toContain("href='/sign-in'")
    expect(menu).toContain("href='/sign-up'")
    expect(menu).toMatch(/>注册<\/Link>/)
    expect(menu).not.toContain('注册并申请权限')
    expect(menu).toContain('workspace-account-popover')
    expect(menu).toContain('/api/admin/impersonation')
  })

  it('hydrates the client and updates every mounted account surface immediately after sign-out', () => {
    expect(sessionHook).toContain('primeWorkspaceSession')
    expect(sessionHook).toContain('markWorkspaceSignedOut')
    expect(sessionHook).toContain('listeners.add')
    expect(app).toContain('primeWorkspaceSession(pageProps?.workspaceSession)')
    expect(menu).toContain('markWorkspaceSignedOut()')
    expect(menu).toContain("router.replace('/')")
    expect(menu).not.toContain("signOut({ redirectUrl: '/' })")
  })

  it('centralizes personal and owner settings in a compact section layout', () => {
    expect(system).toContain("{ key: 'ai', label: '模型与 API' }")
    expect(system).toContain("{ key: 'ai-usage', label: '用量与费用' }")
    expect(system).toContain("{ key: 'wechat', label: '微信与提醒' }")
    expect(system).toContain("{ key: 'courses', label: '课程自动化' }")
    expect(system).toContain("{ key: 'content', label: '内容与同步' }")
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
    expect(members).toContain('permission-switch')
    expect(styles).toContain('.member-permission-grid .permission-switch')
  })

  it('supports a self-managed nickname and remote avatar URL without UI architecture lectures', () => {
    expect(account).toContain('/api/account/profile')
    expect(account).toContain('显示昵称')
    expect(account).toContain('头像 URL')
    expect(account).not.toContain('站内只保存 URL')
    expect(account).not.toContain('数据空间')
    expect(profileApi).toContain("['http:', 'https:']")
    expect(profileApi).toContain('auth.actorProfile.id')
  })

  it('keeps a quiet path home and a compact maintenance surface', () => {
    expect(shell).toContain("className='desk-home-link'")
    expect(shell).toContain("href='/'")
    expect(system).toContain('重新检测')
    expect(system).toContain('AdminContentSync')
    expect(system).not.toContain('部署级密钥不会在浏览器中展示或修改')
  })

  it('turns writing into a real editor instead of a module summary page', () => {
    expect(writing).toContain('MarkdownDocument')
    expect(writing).toContain('/api/notes?scope=writing')
    expect(writing).toContain('saveDraft({ quiet: true })')
    expect(writing).toContain('wordStats')
    expect(writing).not.toContain('随手记负责保存碎片')
  })
})
