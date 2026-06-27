import { countCourseNoteChars } from '@/lib/course/markdownStats'

function readableSnippet(markdown = '', limit = 150) {
  return String(markdown || '')
    .replace(/<!--[\\s\\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~\`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

export function buildCourseNoteLibraryEntry(job = {}, workflow = {}) {
  const lessons = [...(workflow.lessons || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map(lesson => {
      const markdown = lesson.finalNote?.markdown || ''
      return {
        key: lesson.key,
        order: Number(lesson.order || 0),
        title: lesson.title || '未命名课次',
        status: lesson.status || 'preflight_required',
        hasNote: Boolean(markdown),
        charCount: markdown ? countCourseNoteChars(markdown) : 0,
        summary: markdown ? readableSnippet(markdown) : '',
        updatedAt: lesson.finalNote?.updatedAt || lesson.completedAt || job.updated_at || '',
        completedAt: lesson.completedAt || ''
      }
    })

  return {
    id: job.id,
    courseName: job.course_name || workflow.courseSpec?.courseName || '未命名课程',
    teacher: job.teacher || workflow.courseSpec?.teacher || '',
    status: workflow.status || job.current_node || job.status || 'preflight_required',
    updatedAt: job.updated_at || workflow.updatedAt || '',
    lessonCount: lessons.length,
    noteCount: lessons.filter(lesson => lesson.hasNote).length,
    completedCount: lessons.filter(lesson => lesson.status === 'completed').length,
    lessons
  }
}
