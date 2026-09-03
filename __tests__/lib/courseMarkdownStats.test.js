import { countCourseNoteChars } from '@/lib/course/markdownStats'

describe('course note character count', () => {
  it('counts readable text without Markdown control characters or spaces', () => {
    expect(countCourseNoteChars('# 标题\n\n- 第一项\n- [链接](https://example.com)')).toBe(7)
  })

  it('ignores HTML metadata wrappers', () => {
    expect(countCourseNoteChars('<details><summary>元数据</summary></details>')).toBe(3)
  })
})
