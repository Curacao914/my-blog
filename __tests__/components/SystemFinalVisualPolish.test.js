const fs = require('fs')
const path = require('path')

describe('Round 10 final visual polish', () => {
  const home = fs.readFileSync(path.join(process.cwd(), 'pages/index.js'), 'utf8')
  const styles = fs.readFileSync(
    path.join(process.cwd(), 'styles/lawtech-system.css'),
    'utf8'
  )

  it('renders either the real cover or the fallback', () => {
    expect(home).toContain("item.cover ? (")
    expect(home).toContain('<ContentCover item={item} />')
    expect(home).toContain("className='home-stack-fallback-v10'")
  })

  it('restores Reading motion and removes legacy hover layers', () => {
    expect(styles).toContain('.home-stack-track-v11')
    expect(styles).toContain('transition: transform 680ms')
    expect(styles).toContain('content: none !important')
  })

  it('keeps the selected Home tab above the lower rim', () => {
    expect(styles).toContain(
      ".home-app-titlebar-v7 .home-window-switcher button[aria-current='page']"
    )
    expect(styles).toContain(".home-app-titlebar-v7 .home-window-switcher button[aria-current='page']")
    expect(styles).toContain('transform: translateY(-1px)')
    expect(styles).toContain('margin-bottom: 3px')
  })
})
