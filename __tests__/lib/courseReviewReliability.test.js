import { normalizeCourseReviewScores } from '@/lib/course/onlineRunner'
import { completeFinalReview, requestNodeRevision } from '@/lib/course/workflowState'
import { getNextCourseWorkerTasks } from '@/lib/course/workerTasks'

const node = patch => ({
  id:'node-1', outlineNodeId:'outline-1', title:'节点一', status:'node_human_review',
  lineRange:[1,20], slideRange:[1,2], draft:'正文',
  versions:[{ version:1, value:'正文' }],
  reviewerReports:[{ value:{ decision:'human_review', reviewedDraftVersion:1, issues:[] } }],
  revisionRequests:[], revisionCount:2,
  taskFailures:{ writer:0, reviewer:0, revision:0 }, writerBrief:{}, ...patch
})
const workflow = (lessonPatch = {}, workflowPatch = {}) => ({
  status:'node_human_review', currentStep:'node_review',
  courseSpec:{ qualityThreshold:75, maxAutoRevisions:2, reviewConcurrency:2 },
  steps:[],
  lessons:[{ key:'lesson-1', order:1, title:'第一课', status:'node_human_review', nodes:[node({})], outline:[], ...lessonPatch }],
  ...workflowPatch
})

describe('course review reliability', () => {
  it('normalizes 0-10 scores to 0-100', () => {
    expect(normalizeCourseReviewScores({
      coverage:8, grounding:8, logic:9, detail:9, sourceCoverage:8
    })).toMatchObject({
      coverage:80, grounding:80, logic:90, detail:90, sourceCoverage:80
    })
  })

  it('keeps 0-100 scores unchanged', () => {
    expect(normalizeCourseReviewScores({
      coverage:82, grounding:78, logic:90, detail:88, sourceCoverage:80
    }).coverage).toBe(82)
  })

  it('does not reset revision count for an explicit human request', () => {
    const result = requestNodeRevision(workflow(), 'lesson-1', 'node-1', '请按人工说明修改')
    const current = result.lessons[0].nodes[0]
    expect(current.revisionCount).toBe(2)
    expect(current.manualRevisionRequested).toBe(true)
    expect(getNextCourseWorkerTasks(result)[0].type).toBe('revise-node')
  })

  it('routes an unmapped final-review issue to human review', () => {
    const input = workflow({
      status:'final_review',
      finalNote:{ markdown:'# 第一课\n\n正文' },
      finalNoteVersions:[{ version:1, value:'# 第一课\n\n正文' }],
      nodes:[node({ status:'node_approved', approvedAt:new Date().toISOString() })]
    }, { status:'final_review', currentStep:'final_review' })
    const result = completeFinalReview(input, 'lesson-1', {
      decision:'revise', coverage:80, grounding:80, logic:80, detail:80, sourceCoverage:80,
      summary:'存在需要确认的问题。',
      issues:[{ severity:'blocking', message:'问题没有定位到具体节点。', nodeId:'' }]
    })
    expect(result.status).toBe('final_revision_required')
    expect(result.lessons[0].nodes[0].status).toBe('node_approved')
    expect(result.lessons[0].finalRevisionRequests.at(-1).value.source).toBe('final-review')
  })
})
