import { buildCourseNoteLibraryEntry } from '@/lib/course/noteLibrary'

describe('course note library hierarchy', () => {
  it('maps one course to ordered lesson notes without returning full markdown', () => {
    const entry = buildCourseNoteLibraryEntry(
      { id: 'job-1', course_name: '经济法', teacher: '老师', updated_at: '2026-06-27T00:00:00.000Z' },
      {
        status: 'completed',
        lessons: [
          { key: 'lesson-2', order: 2, title: '第二课', status: 'completed', finalNote: { markdown: '# 第二课\n\n正文二。' } },
          { key: 'lesson-1', order: 1, title: '第一课', status: 'completed', finalNote: { markdown: '# 第一课\n\n正文一。' } }
        ]
      }
    )

    expect(entry.courseName).toBe('经济法')
    expect(entry.noteCount).toBe(2)
    expect(entry.lessons.map(item => item.key)).toEqual(['lesson-1', 'lesson-2'])
    expect(entry.lessons[0].charCount).toBeGreaterThan(0)
    expect(entry.lessons[0]).not.toHaveProperty('markdown')
  })
})
