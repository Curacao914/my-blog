import { authRedirectFromQuery, safeAuthRedirect } from '@/lib/auth/redirect'

describe('authentication redirects', () => {
  it('prefers Clerk redirect_url and keeps an internal desk route', () => {
    expect(
      authRedirectFromQuery({
        redirect_url: '/desk/today',
        redirectTo: '/desk'
      })
    ).toBe('/desk/today')
  })

  it('supports the legacy redirectTo parameter', () => {
    expect(authRedirectFromQuery({ redirectTo: '/desk/reading' })).toBe(
      '/desk/reading'
    )
  })

  it('rejects external, protocol-relative, and authentication-loop redirects', () => {
    expect(safeAuthRedirect('https://example.com')).toBe('/desk/today')
    expect(safeAuthRedirect('//example.com')).toBe('/desk/today')
    expect(safeAuthRedirect('/sign-in?redirect_url=/sign-in')).toBe(
      '/desk/today'
    )
    expect(safeAuthRedirect('/sign-up')).toBe('/desk/today')
  })
})
