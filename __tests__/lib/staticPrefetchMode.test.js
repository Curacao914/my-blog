import {
  shouldSkipStaticPrefetch,
  STATIC_PREFETCH_SKIP_MODE
} from '@/lib/utils/staticPrefetchMode'

describe('Docker static prefetch mode', () => {
  test('skip is explicit and case-insensitive', () => {
    expect(
      shouldSkipStaticPrefetch({
        LAW_TECH_STATIC_PREFETCH_MODE: 'SKIP'
      })
    ).toBe(true)
    expect(STATIC_PREFETCH_SKIP_MODE).toBe('skip')
  })

  test('normal builds keep static prefetch enabled', () => {
    expect(shouldSkipStaticPrefetch({})).toBe(false)
    expect(
      shouldSkipStaticPrefetch({
        LAW_TECH_STATIC_PREFETCH_MODE: 'normal'
      })
    ).toBe(false)
  })
})
