import { buildCourseNoteLibraryEntry } from '@/lib/course/noteLibrary'

describe('course note library hierarchy', () => {
  it('maps ordered lesson notes without returning full markdown', () => {
    const entry = buildCourseNoteLibraryEntry(
      { id: 'job-1', course_name: '经济法' },
      {
        status: 'completed',
        lessons: [
          { key: 'lesson-2', order: 2, title: '第二课', status: 'completed', finalNote: { markdown: '# 第二课\n\n正文二。' } },
          { key: 'lesson-1', order: 1, title: '第一课', status: 'completed', finalNote: { markdown: '# 第一课\n\n正文一。' } }
        ]
      }
    )
    expect(entry.noteCount).toBe(2)
    expect(entry.trashCount).toBe(0)
    expect(entry.lessons.map(item => item.key)).toEqual(['lesson-1', 'lesson-2'])
    expect(entry.lessons[0]).not.toHaveProperty('markdown')
  })

  it('keeps a trashed note recoverable while hiding it from active counts', () => {
    const entry = buildCourseNoteLibraryEntry(
      { id: 'job-1', course_name: '经济法' },
      {
        status: 'completed',
        lessons: [{
          key: 'lesson-1',
          order: 1,
          title: '第一课',
          status: 'completed',
          finalNote: { markdown: '# 第一课\n\n正文。' },
          noteDeletion: { deletedAt: '2026-06-27T00:00:00.000Z' }
        }]
      }
    )
    expect(entry.noteCount).toBe(0)
    expect(entry.trashCount).toBe(1)
    expect(entry.lessons[0]).toMatchObject({
      hasNote: false,
      recoverable: true,
      trashed: true
    })
  })
})
