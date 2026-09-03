const fs = require('fs')
const path = require('path')

describe('Round 11 Reading and mobile contract', () => {
  const home = fs.readFileSync(path.join(process.cwd(), 'pages/index.js'), 'utf8')
  const styles = fs.readFileSync(path.join(process.cwd(), 'styles/lawtech-system.css'), 'utf8')

  it('uses a continuous vertical track with a loop clone', () => {
    expect(home).toContain('home-stack-track-v11')
    expect(home).toContain('trackItems = total > 1')
    expect(home).toContain('onTransitionEnd={finishSlide}')
    expect(home).toContain("'--home-reading-slide': slideIndex")
  })

  it('resets the loop without a visible backwards jump', () => {
    expect(home).toContain('slideIndex !== total')
    expect(home).toContain('setResetting(true)')
    expect(home).toContain('window.requestAnimationFrame')
    expect(styles).toContain('.home-stack-track-v11.is-resetting')
    expect(styles).toContain('transition: none !important')
  })

  it('contains a complete phone layout contract', () => {
    expect(styles).toContain('@media (max-width: 760px)')
    expect(styles).toContain('.home-desktop-grid-v7')
    expect(styles).toContain('flex-direction: column !important')
    expect(styles).toContain('.lawtech-public-page > .public-shell')
    expect(styles).toContain('.desk-app-window > .desk-layout')
    expect(styles).toContain('.home-space-map > svg')
  })

  it('prevents common horizontal overflow sources on phones', () => {
    expect(styles).toContain('overflow-x: hidden !important')
    expect(styles).toContain('grid-template-columns: minmax(0, 1fr) !important')
    expect(styles).toContain('.content-reading-body table')
    expect(styles).toContain('overflow-x: auto')
  })
})
