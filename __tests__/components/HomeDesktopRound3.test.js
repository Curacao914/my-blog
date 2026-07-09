
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')

describe('round 3 homepage desktop', () => {
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
    expect(home).not.toContain('grid-template-columns:repeat(2')
    expect(home).not.toContain('grid-template-columns: repeat(2')
  })

  it('keeps system shell outside homepage work', () => {
    expect(home).toContain("<PublicHeader active='content' randomItems={randomItems} />")
    expect(home).toContain('<LawTechDeskStyles />')
  })
})
