const fs = require('fs')

function source(path) {
  return fs.readFileSync(path, 'utf8')
}

describe('authentication stability and passkey entry', () => {
  it('does not turn a transient session refresh failure into a local sign-out', () => {
    const hook = source('hooks/useWorkspaceSession.js')
    expect(hook).toContain('const fallback = cached?.signedIn ? cached : null')
    expect(hook).toContain('value.retryable && fallback')
    expect(hook).toContain("window.addEventListener('focus'")
    expect(hook).toContain('session.sessionId')
  })

  it('keeps production authentication on the canonical domain', () => {
    const canonical = source('lib/auth/canonicalOrigin.js')
    const desk = source('lib/auth/deskPage.js')
    const authPage = source('lib/auth/authPage.js')
    expect(canonical).toContain("'https://law-tech.dev'")
    expect(desk).toContain('canonicalAuthRedirect')
    expect(authPage).toContain('canonicalAuthRedirect')
  })

  it('exposes Clerk security and passkey management from account settings', () => {
    const settings = source('components/WorkspaceAccountMenu.js')
    expect(settings).toContain('openUserProfile')
    expect(settings).toContain('Passkey')
    expect(settings).toContain('Touch ID')
    expect(settings).toContain('Face ID')
  })

  it('allows Clerk auth state changes to refresh normally', () => {
    const app = source('pages/_app.js')
    expect(app).not.toContain('__unstable_invokeMiddlewareOnAuthStateChange')
    expect(app).toContain("signInUrl='/sign-in'")
    expect(app).toContain("signUpUrl='/sign-up'")
  })
})
