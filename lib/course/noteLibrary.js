import { countCourseNoteChars } from '@/lib/course/markdownStats'

function readableSnippet(markdown = '', limit = 150) {
  return String(markdown || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function orderedLessons(workflow = {}) {
  return [...(workflow.lessons || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
}

function lessonLibraryItem(lesson = {}, job = {}) {
  const markdown = lesson.finalNote?.markdown || ''
  const trashed = Boolean(lesson.noteDeletion?.deletedAt)
  const stored = Boolean(markdown)
  return {
    key: lesson.key,
    order: Number(lesson.order || 0),
    title: lesson.title || '未命名课次',
    status: lesson.status || 'preflight_required',
    hasNote: stored && !trashed,
    recoverable: stored && trashed,
    trashed,
    deletedAt: lesson.noteDeletion?.deletedAt || '',
    charCount: stored ? countCourseNoteChars(markdown) : 0,
    summary: stored && !trashed ? readableSnippet(markdown) : '',
    hasBrief: Boolean(lesson.brief?.markdown && !lesson.brief?.stale),
    briefUpdatedAt: lesson.brief?.updatedAt || '',
    updatedAt: lesson.finalNote?.updatedAt || lesson.completedAt || job.updated_at || '',
    completedAt: lesson.completedAt || '',
    publication: lesson.publication || null,
    canRegenerate: lesson.status === 'note_removed' &&
      (lesson.nodes || []).length > 0 &&
      (lesson.nodes || []).every(node => node.status === 'node_approved')
  }
}

export function buildCourseNoteLibraryEntry(job = {}, workflow = {}) {
  const lessons = orderedLessons(workflow).map(lesson => lessonLibraryItem(lesson, job))

  return {
    id: job.id,
    courseName: job.course_name || workflow.courseSpec?.courseName || '未命名课程',
    teacher: job.teacher || workflow.courseSpec?.teacher || '',
    status: workflow.status || job.current_node || job.status || 'preflight_required',
    updatedAt: job.updated_at || workflow.updatedAt || '',
    lessonCount: lessons.length,
    noteCount: lessons.filter(lesson => lesson.hasNote).length,
    trashCount: lessons.filter(lesson => lesson.trashed).length,
    completedCount: lessons.filter(lesson => lesson.status === 'completed').length,
    lessons
  }
}

export function buildCourseNoteReaderEntry(job = {}, workflow = {}, lessonKey = '') {
  const lessons = orderedLessons(workflow)
  const selected = lessons.find(lesson => lesson.key === lessonKey)
  if (!selected) throw new Error('Course lesson not found')
  if (selected.noteDeletion?.deletedAt) throw new Error('Course note is in trash')
  if (!selected.finalNote?.markdown) throw new Error('Course note is not ready')

  const readableLessons = lessons
    .filter(lesson => lesson.finalNote?.markdown && !lesson.noteDeletion?.deletedAt)
    .map(lesson => lessonLibraryItem(lesson, job))
  const selectedIndex = readableLessons.findIndex(lesson => lesson.key === lessonKey)

  return {
    course: {
      id: job.id,
      name: job.course_name || workflow.courseSpec?.courseName || '未命名课程',
      teacher: job.teacher || workflow.courseSpec?.teacher || '',
      updatedAt: job.updated_at || workflow.updatedAt || '',
      noteCount: readableLessons.length,
      lessons: readableLessons
    },
    lesson: {
      ...lessonLibraryItem(selected, job),
      markdown: selected.finalNote.markdown,
      versionCount: Array.isArray(selected.finalNoteVersions) ? selected.finalNoteVersions.length : 0
    },
    navigation: {
      previous: selectedIndex > 0 ? readableLessons[selectedIndex - 1] : null,
      next: selectedIndex >= 0 && selectedIndex < readableLessons.length - 1
        ? readableLessons[selectedIndex + 1]
        : null
    }
  }
}
