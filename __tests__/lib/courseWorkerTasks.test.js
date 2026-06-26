import { getNextCourseWorkerTask } from '@/lib/course/workerTasks'

describe('course worker task planner', () => {
  it('hands assembled lessons to final review before completion', () => {
    const workflow = {
      status: 'final_review',
      courseSpec: { courseName: '证据法' },
      lessons: [
        {
          key: 'lesson-01',
          title: '第1课',
          blueprint: { mainLine: '证据规则' },
          finalNote: { markdown: '# 第1课\n\n正文' },
          nodes: [{ id: 'node-1', status: 'node_approved' }]
        }
      ]
    }

    const task = getNextCourseWorkerTask(workflow)

    expect(task.type).toBe('final-review')
    expect(task.lessonKey).toBe('lesson-01')
    expect(task.lesson.finalNote.markdown).toContain('正文')
  })

  it('uses a revision task for nodes that failed review', () => {
    const workflow = {
      status: 'node_revision_required',
      courseSpec: { courseName: '证据法' },
      lessons: [
        {
          key: 'lesson-01',
          title: '第1课',
          blueprint: { mainLine: '证据规则' },
          outline: [],
          nodes: [
            {
              id: 'node-1',
              status: 'node_revision_required',
              sourceText: '来源文本',
              reviewerReports: [
                {
                  value: {
                    decision: 'revise',
                    issues: ['覆盖不足']
                  }
                }
              ]
            }
          ]
        }
      ]
    }

    const task = getNextCourseWorkerTask(workflow)

    expect(task.type).toBe('revise-node')
    expect(task.node.reviewerReports[0].value.issues).toContain('覆盖不足')
  })
})
