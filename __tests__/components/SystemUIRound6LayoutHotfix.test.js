const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('System UI Round 6 layout compatibility', () => {
  const home = read('pages/index.js')
  const css = read('styles/lawtech-system.css')

  test('removes the unexplained rail and keeps signature looping', () => {
    expect(home).not.toContain("home-app-rail-mark'>C")
    expect(home).not.toContain('function AppRail')
    expect(home).toContain('<DynamicSignature compact loop />')
  })

  test('keeps fixed menu bar and dock anchors', () => {
    expect(css).toContain('position: fixed !important;')
    expect(css).toContain('bottom: 7px !important;')
  })

  test('uses a landscape article stack with title overlay', () => {
    expect(css).toContain('.home-stack-card-v6::after')
    expect(css).toContain('position: absolute;')
  })
})
