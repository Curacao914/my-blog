import { publicContentRevalidationPaths } from '@/lib/content/revalidation'

describe('public content revalidation', () => {
  it('refreshes home, content, search and the published detail path together', () => {
    expect(publicContentRevalidationPaths('notes/course/lesson-1')).toEqual([
      '/',
      '/content',
      '/search',
      '/content/notes/course/lesson-1'
    ])
  })

  it('does not manufacture a detail route without a slug', () => {
    expect(publicContentRevalidationPaths()).toEqual(['/', '/content', '/search'])
  })
})
