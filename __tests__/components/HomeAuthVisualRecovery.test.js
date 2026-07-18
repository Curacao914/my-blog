const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const styles = fs.readFileSync(path.join(root, 'styles/lawtech-system.css'), 'utf8')
const app = fs.readFileSync(path.join(root, 'pages/_app.js'), 'utf8')
const account = fs.readFileSync(path.join(root, 'components/WorkspaceAccountMenu.js'), 'utf8')

describe('homepage and authentication visual recovery', () => {
  it('disables legacy SVG refraction in the editorial shell', () => {
    expect(styles).toContain('v9 compositor safety')
    expect(styles).toContain("filter: none !important")
    expect(styles).toContain("content: none !important")
  })

  it('lets Clerk resolve the SDK from the publishable-key domain', () => {
    expect(app).not.toContain('clerkJSUrl=')
    expect(app).not.toContain('cdn.jsdelivr.net/npm/@clerk/clerk-js')
  })

  it('keeps the editorial library grid complete and card footers in flow', () => {
    expect(styles).toContain('Editorial workspace repair v10')
    expect(styles).toContain('grid-template-columns: minmax(0, 1.18fr) minmax(280px, .82fr) !important')
    expect(styles).toContain('grid-template-rows: repeat(3, minmax(96px, 1fr)) !important')
    expect(styles).toContain('position: relative !important')
    expect(styles).toContain('inset: auto !important')
  })

  it('does not render an unexplained public loading capsule', () => {
    expect(account).not.toContain("<span className='workspace-account-loading'")
  })
})
