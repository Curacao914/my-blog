import { publicContentRevalidationPaths } from '@/lib/content/revalidation'

const basePaths = ['/', '/content', '/search', '/archive', '/category', '/tag']

describe('public content revalidation', () => {
  it('refreshes every discovery surface and the published detail path together', () => {
    expect(publicContentRevalidationPaths('notes/course/lesson-1')).toEqual([
      ...basePaths,
      '/content/notes/course/lesson-1'
    ])
  })

  it('does not manufacture a detail route without a slug', () => {
    expect(publicContentRevalidationPaths()).toEqual(basePaths)
  })
})
