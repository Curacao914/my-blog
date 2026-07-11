const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const home = read('pages/index.js')
const header = read('components/law-tech/PublicHeader.js')
const signal = read('components/law-tech/PublicHeaderSignal.js')
const desk = read('components/DeskShell.js')
const identity = read('components/DeskIdentityCard.js')
const about = read('pages/about/index.js')
const profile = read('lib/siteProfile.js')
const editor = read('components/about/PublicProfileEditor.js')
const styles = read('styles/lawtech-system.css')

describe('system UI round 7 final integration', () => {
  it('uses real multi-tag bridges without forcing every collection to connect', () => {
    expect(home).toContain('buildSpaceModel')
    expect(home).toContain('const tags = [...new Set(publicContentTags(item).filter(Boolean))]')
    expect(home).toContain('if (!categoriesForTag || categoriesForTag.size < 2) return')
    expect(home).toContain('共享标签只在确有关系时连接')
  })

  it('adds a configurable current-focus widget and balanced right column', () => {
    expect(home).toContain('function FocusWidget')
    expect(home).toContain('safeProfile.focus')
    expect(profile).toContain('focus: {')
    expect(editor).toContain('首页状态')
    expect(styles).toContain('grid-template-rows:214px 104px 98px 103px minmax(62px,1fr)')
  })

  it('keeps date only in the menu and makes About owner-only', () => {
    expect(signal).toContain('<time')
    expect(signal).not.toContain('<small')
    expect(header).toContain("MENU_ITEMS.filter(item => item.key !== 'about' || showAbout)")
    expect(about).toContain('getServerSideProps')
    expect(about).toContain('!session.isOwner')
  })

  it('keeps Desk aligned, compact and wheel-scrollable', () => {
    expect(desk).not.toContain('WorkspaceAccountMenu')
    expect(identity).toContain('desk-identity-card-v7')
    expect(styles).toContain('.desk-identity-card-v7 { display:grid')
    expect(styles).toContain('touch-action:pan-y')
    expect(styles).toContain('overflow:visible !important')
    expect(styles).toContain('grid-template-columns:repeat(3,minmax(0,1fr))')
  })
})
