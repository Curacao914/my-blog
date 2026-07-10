
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')

describe('round 3 homepage desktop', () => {
  it('keeps homepage styles globally scoped to the desktop root', () => {
    expect(home).toContain('<style jsx global>')
    expect(home).toContain('.home-desktop-round3 .canvas-primary-paper')
    expect(home).toContain('.home-desktop-round3 .update-slide-card')
    expect(home).not.toContain('<style jsx>{`')
  })

  it('keeps homepage as a desktop canvas, not a billboard or generic card wall', () => {
    expect(home).toContain('home-desktop-round3')
    expect(home).toContain('desktop-canvas-view')
    expect(home).toContain('LatestCanvas')
    expect(home).toContain('canvas-primary-paper')
    expect(home).not.toContain('home-feature-copy')
    expect(home).not.toContain('最近翻开的纸页')
    expect(home).not.toContain('把麻烦事收进抽屉')
  })

  it('keeps right updates as a single-column vertical carousel', () => {
    expect(home).toContain('SingleColumnUpdates')
    expect(home).toContain('single-column-updates')
    expect(home).toContain('flex-direction: column')
    expect(home).toContain('flex: 0 0 100%')
    expect(home).toContain('grid-template-columns: 1fr')
    expect(home).not.toContain('desktop-widget-rail {\n          grid-template-columns: repeat(2')
    expect(home).not.toContain('grid-template-columns: repeat(2, minmax(0, 1fr));\n        }\n        .home-desktop-round3 .desktop-widget-rail')
  })

  it('keeps system shell outside homepage work but constrains it on the home route', () => {
    expect(home).toContain("<PublicHeader active='content' randomItems={randomItems} />")
    expect(home).toContain('.home-desktop-round3 .system-menu-bar')
    expect(home).toContain('<LawTechDeskStyles />')
  })
})
