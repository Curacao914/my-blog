import {
  applyNodeReview,
  approveNode,
  approveOutline,
  assembleFinalNote,
  completeFinalReview,
  createInitialWorkflow,
  planNodesFromOutline,
  saveCourseSpec,
  saveNodeDraft,
  startOutlineReview
} from '@/lib/course/workflowState'
import { getNextCourseWorkerTask } from '@/lib/course/workerTasks'
import { buildTextPack } from '@/lib/course/textpack'

const { executeTask } = require('../../scripts/course-worker/run-job.js')

describe('deterministic course workflow end to end', () => {
  it('runs import-ready text through outline, writer, reviewer, assembly and final review', async () => {
    const textPack = buildTextPack({
      course: { name: '证据法', teacher: '张老师' },
      lessons: [{ order: 1, title: '第一课', transcript: Array.from({ length: 24 }, (_, index) => `第${index + 1}行：课程内容`).join('\n') }],
      decks: []
    })
    let workflow = saveCourseSpec(createInitialWorkflow({ textPack }), { qualityThreshold: 75, nodeSplitLineThreshold: 200 })

    let task = getNextCourseWorkerTask(workflow)
    expect(task.type).toBe('generate-outline')
    let action = await executeTask(task, { deterministic: true })
    workflow = startOutlineReview(workflow, action)
    workflow = approveOutline(workflow, action.lessonKey)

    task = getNextCourseWorkerTask(workflow)
    expect(task.type).toBe('plan-nodes')
    workflow = planNodesFromOutline(workflow, task.lessonKey)

    task = getNextCourseWorkerTask(workflow)
    expect(task.type).toBe('write-node')
    action = await executeTask(task, { deterministic: true })
    workflow = saveNodeDraft(workflow, action.lessonKey, action.nodeId, action.markdown, { source: 'worker' })

    task = getNextCourseWorkerTask(workflow)
    expect(task.type).toBe('review-node')
    action = await executeTask(task, { deterministic: true })
    workflow = applyNodeReview(workflow, action.lessonKey, action.nodeId, action.reviewerReport)
    workflow = approveNode(workflow, action.lessonKey, action.nodeId)

    task = getNextCourseWorkerTask(workflow)
    expect(task.type).toBe('assemble')
    workflow = assembleFinalNote(workflow, task.lessonKey)

    task = getNextCourseWorkerTask(workflow)
    expect(task.type).toBe('final-review')
    action = await executeTask(task, { deterministic: true })
    workflow = completeFinalReview(workflow, action.lessonKey, action.qualityReport)

    expect(workflow.status).toBe('completed')
    expect(workflow.progress).toBe(100)
    expect(workflow.lessons[0].finalNote.markdown).toContain('课程内容')
  })
})
