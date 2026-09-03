import {
  purgeLessonNote,
  regenerateLessonNote,
  restoreLessonNote,
  trashLessonNote
} from '@/lib/course/workflowState'
import { getNextCourseWorkerTasks } from '@/lib/course/workerTasks'

function fixture() {
  return {
    status: 'completed',
    currentStep: 'completed',
    progress: 100,
    paused: false,
    steps: [
      { key: 'assembly', status: 'done' },
      { key: 'final_review', status: 'done' },
      { key: 'completed', status: 'done' }
    ],
    courseSpec: { courseName: '经济法' },
    lessons: [{
      key: 'lesson-1',
      order: 1,
      title: '第一课',
      status: 'completed',
      nodes: [{ id: 'node-1', status: 'node_approved', draft: '节点正文' }],
      finalNote: { markdown: '# 第一课\n\n最终正文。' },
      finalNoteVersions: [{ version: 1, value: '# 第一课\n\n最终正文。' }],
      finalReviewReports: [],
      finalRevisionRequests: [],
      qualityReport: { decision: 'human_approved' },
      noteDeletion: null
    }]
  }
}

describe('lesson note lifecycle', () => {
  it('soft deletes without removing note data', () => {
    const result = trashLessonNote(fixture(), 'lesson-1')
    expect(result.lessons[0].noteDeletion.deletedAt).toBeTruthy()
    expect(result.lessons[0].finalNote.markdown).toContain('最终正文')
    expect(result.lessons[0].finalNoteVersions).toHaveLength(1)
    expect(result.status).toBe('completed')
  })

  it('restores a soft-deleted note', () => {
    const result = restoreLessonNote(trashLessonNote(fixture(), 'lesson-1'), 'lesson-1')
    expect(result.lessons[0].noteDeletion).toBeNull()
    expect(result.lessons[0].finalNote.markdown).toContain('最终正文')
  })

  it('permanently deletes only after trash and preserves approved nodes', () => {
    expect(() => purgeLessonNote(fixture(), 'lesson-1')).toThrow(/trash/)
    const result = purgeLessonNote(trashLessonNote(fixture(), 'lesson-1'), 'lesson-1')
    expect(result.status).toBe('note_removed')
    expect(result.lessons[0].finalNote).toBeNull()
    expect(result.lessons[0].finalNoteVersions).toEqual([])
    expect(result.lessons[0].nodes[0].draft).toBe('节点正文')
    expect(getNextCourseWorkerTasks(result)[0]).toMatchObject({
      type: 'idle',
      reason: 'waiting-note-regeneration'
    })
  })

  it('regenerates only after an explicit action', () => {
    const removed = purgeLessonNote(trashLessonNote(fixture(), 'lesson-1'), 'lesson-1')
    const result = regenerateLessonNote(removed, 'lesson-1')
    expect(result.status).toBe('assembly_pending')
    expect(getNextCourseWorkerTasks(result)[0]).toMatchObject({
      type: 'assemble',
      lessonKey: 'lesson-1'
    })
  })
})
