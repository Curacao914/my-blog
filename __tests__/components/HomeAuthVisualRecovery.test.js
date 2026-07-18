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

  it('loads Clerk from a stable public SDK endpoint', () => {
    expect(app).toContain('clerkJSUrl={CLERK_JS_URL}')
    expect(app).toContain('cdn.jsdelivr.net/npm/@clerk/clerk-js@5.127.1')
  })

  it('does not render an unexplained public loading capsule', () => {
    expect(account).not.toContain("<span className='workspace-account-loading'")
  })
})
