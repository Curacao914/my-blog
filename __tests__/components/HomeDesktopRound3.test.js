const fs = require('fs')
const path = require('path')

describe('round 3 homepage desktop emergency stabilization', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'pages/index.js'), 'utf8')

  test('keeps the homepage as one stable desktop instead of nested tabs', () => {
    expect(source).toContain('home-desktop-round3')
    expect(source).toContain('home-stage')
    expect(source).not.toContain('home-desktop-tab')
    expect(source).not.toContain('setActiveTab')
  })

  test('prevents the oversized blank whiteboard regression', () => {
    expect(source).toContain('height: 100dvh')
    expect(source).toContain('height: calc(100dvh - 206px)')
    expect(source).toContain('max-height: 690px')
    expect(source).toContain('overflow: hidden')
  })

  test('keeps recent content as a single-column filmstrip with real cards', () => {
    expect(source).toContain('home-recent-filmstrip')
    expect(source).toContain('grid-template-columns: 1fr')
    expect(source).toContain('home-recent-card')
    expect(source).not.toContain('grid-template-columns: repeat(2')
  })

  test('keeps real visual surfaces for content covers', () => {
    expect(source).toContain('itemCover')
    expect(source).toContain('backgroundImage')
    expect(source).toContain('home-cover-mosaic')
  })
})
