const fs = require('fs')
const path = require('path')

const api = fs.readFileSync(path.join(process.cwd(), 'pages/api/admin/members.js'), 'utf8')
const impersonation = fs.readFileSync(path.join(process.cwd(), 'pages/api/admin/impersonation.js'), 'utf8')
const session = fs.readFileSync(path.join(process.cwd(), 'pages/api/account/session.js'), 'utf8')
const workspaceProfiles = fs.readFileSync(path.join(process.cwd(), 'lib/server/workspaceProfiles.js'), 'utf8')

describe('member administration boundaries', () => {
  it('keeps member CRUD owner-only and guards destructive deletion', () => {
    expect(api).toContain('requireOwnerRequest')
    expect(api).toContain("req.method === 'POST'")
    expect(api).toContain("req.method === 'PATCH'")
    expect(api).toContain("req.method === 'DELETE'")
    expect(api).toContain('删除成员及数据')
    expect(api).toContain('不能删除自己的管理员账号')
  })

  it('does not trust a stale database owner role without the Clerk owner allowlist', () => {
    expect(workspaceProfiles).toContain("else if (profile.role === 'owner')")
    expect(workspaceProfiles).toContain("patch.role = 'member'")
    expect(workspaceProfiles).toContain("patch.status = invite ? 'active' : 'pending'")
  })

  it('uses a signed, active-profile impersonation flow', () => {
    expect(impersonation).toContain('requireOwnerRequest')
    expect(impersonation).toContain("target.status !== 'active'")
    expect(impersonation).toContain('createImpersonationToken')
    expect(session).toContain('switchableProfiles')
  })
})
