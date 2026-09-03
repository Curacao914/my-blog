const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('site-wide surface consolidation', () => {
  const header = read('components/law-tech/PublicHeader.js')
  const archive = read('pages/archive/index.js')
  const category = read('pages/category/index.js')
  const tag = read('pages/tag/index.js')
  const tasks = read('pages/desk/tasks/index.js')
  const writing = read('pages/desk/writing/index.js')
  const system = read('pages/desk/system/index.js')
  const auth = read('pages/auth/index.js')
  const authApi = read('pages/api/auth/callback/notion.ts')
  const authResult = read('pages/auth/result.js')
  const share = read('pages/s/[token]/index.js')

  it('keeps public browse pages on one visual and data shell', () => {
    expect(archive).toContain('PublicDirectoryPage')
    expect(category).toContain('PublicDirectoryPage')
    expect(tag).toContain('PublicDirectoryPage')
    expect(header).toContain('AdminContentSync')
  })

  it('replaces placeholder workbench modules with real surfaces', () => {
    expect(tasks).toContain("<TodayBoard initialView='all'")
    expect(writing).toContain('WritingDesk')
    expect(system).toContain('SystemDesk')
    expect(tasks).not.toContain('DeskProductPanel')
    expect(writing).not.toContain('DeskProductPanel')
    expect(system).not.toContain('DeskProductPanel')
  })

  it('does not expose oauth secrets, token responses, or share tokens in product pages', () => {
    expect(auth).not.toContain('clientSecret} --')
    expect(auth).not.toContain('Token response')
    expect(auth).not.toContain('JSON.stringify(params.data)')
    expect(authApi).not.toContain('OAUTH_CLIENT_SECRET')
    expect(authApi).not.toContain('OAuth身份信息')
    expect(authResult).not.toContain('router.query?.message')
    expect(share).not.toContain('分享令牌：')
  })
})
