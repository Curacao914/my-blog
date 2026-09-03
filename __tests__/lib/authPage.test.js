import { authPageServerProps } from '@/lib/auth/authPage'

describe('auth page server props', () => {
  it('keeps the sanitized destination available to Clerk', async () => {
    await expect(
      authPageServerProps()({ query: { redirect_url: '/desk/today' } })
    ).resolves.toEqual({
      props: { redirectTo: '/desk/today' }
    })
  })

  it('rejects an external destination', async () => {
    const result = await authPageServerProps()({
      query: { redirect_url: 'https://example.com' }
    })

    expect(result.props.redirectTo).toBe('/desk/today')
  })
})
