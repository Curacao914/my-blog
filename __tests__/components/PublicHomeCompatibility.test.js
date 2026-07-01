const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('public home compatibility entry', () => {
  it('keeps an explicit personal-blog entry pointing to the legacy archive', () => {
    const domain = read('lib/domain/publicHome.js')
    const home = read('pages/index.js')

    expect(domain).toContain("label: '个人博客'")
    expect(domain).toContain("href: '/archive'")
    expect(domain).toContain("meta: '旧文章与时间归档'")
    expect(home).toContain('publicHomeQuickLinks.map')
  })
})
