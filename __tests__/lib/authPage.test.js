import { buildClerkProps, getAuth } from '@clerk/nextjs/server'

import { authPageServerProps } from '@/lib/auth/authPage'

jest.mock('@clerk/nextjs/server', () => ({
  buildClerkProps: jest.fn(),
  getAuth: jest.fn()
}))

describe('auth page server props', () => {
  const req = { headers: {} }

  beforeEach(() => {
    jest.clearAllMocks()
    buildClerkProps.mockReturnValue({ __clerk_ssr_state: { sessionId: null } })
  })

  it('keeps the sanitized destination available to Clerk', async () => {
    getAuth.mockReturnValue({ userId: null })

    await expect(
      authPageServerProps()({ req, query: { redirect_url: '/desk/today' } })
    ).resolves.toEqual({
      props: {
        __clerk_ssr_state: { sessionId: null },
        redirectTo: '/desk/today'
      }
    })
  })

  it('redirects an already authenticated session before rendering the form', async () => {
    getAuth.mockReturnValue({ userId: 'user_admin' })

    await expect(
      authPageServerProps()({ req, query: { redirect_url: '/desk/courses' } })
    ).resolves.toEqual({
      redirect: {
        destination: '/desk/courses',
        permanent: false
      }
    })
  })

  it('rejects an external destination', async () => {
    getAuth.mockReturnValue({ userId: null })

    const result = await authPageServerProps()({
      req,
      query: { redirect_url: 'https://example.com' }
    })

    expect(result.props.redirectTo).toBe('/desk/today')
  })
})
