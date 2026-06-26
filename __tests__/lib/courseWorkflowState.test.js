import {
  approveOutline,
  assembleFinalNote,
  approveNode,
  completeFinalReview,
  createInitialWorkflow,
  failStep,
  planNodesFromOutline,
  requireTransition,
  saveCourseSpec,
  startOutlineReview,
  updateOutline,
  updateNodeDraft
} from '@/lib/course/workflowState'
import { buildTextPack } from '@/lib/course/textpack'

function sampleWorkflow() {
  const textPack = buildTextPack({
    course: { name: '证据法', teacher: '张老师' },
    lessons: [
      {
        order: 1,
        title: '第1课',
        transcript: ['第一行 证据规则', '第二行 证明责任', '第三行 案例分析'].join('\n'),
        sourceMap: [
          { line: 1, sourceLine: 3, time: '00:00:01 --> 00:00:03', file: '第1课.srt' },
          { line: 2, sourceLine: 4, time: '00:00:04 --> 00:00:05', file: '第1课.srt' },
          { line: 3, sourceLine: 5, time: '00:00:06 --> 00:00:07', file: '第1课.srt' }
        ]
      }
    ],
    decks: [
      {
        title: '课件',
        slideCount: 1,
        markdown: '## 第 1 页\n证据规则与证明责任',
        slides: [{ slideNumber: 1, text: '证据规则与证明责任' }]
      }
    ]
  })
  return createInitialWorkflow({ textPack, courseName: '证据法', teacher: '张老师' })
}

describe('course workflow state machine', () => {
  it('requires preflight before outline and outline approval before node planning', () => {
    const workflow = sampleWorkflow()

    expect(() => requireTransition(workflow, 'outline_generating')).toThrow(/preflight/)

    const withSpec = saveCourseSpec(workflow, {
      goal: '闭卷复习',
      detailLevel: 'high',
      nodeSplitThreshold: 20,
      qualityThreshold: 80
    })
    expect(withSpec.status).toBe('preflight_approved')
    expect(requireTransition(withSpec, 'outline_generating')).toBe(true)
    expect(() => requireTransition(withSpec, 'node_planning')).toThrow(/outline/)
  })

  it('plans forced subnodes and blocks assembly until every node is approved', () => {
    const withSpec = saveCourseSpec(sampleWorkflow(), {
      goal: '全面笔记',
      detailLevel: 'high',
      nodeSplitThreshold: 8,
      qualityThreshold: 75
    })
    const withOutline = startOutlineReview(withSpec, {
      lessonKey: 'lesson-01',
      outline: [
        {
          title: '证据规则总论',
          lineRange: [1, 3],
          slideRange: [1, 1],
          rationale: '覆盖本课全部主线',
          importance: 'high'
        }
      ]
    })
    const edited = updateOutline(withOutline, 'lesson-01', node => ({
      ...node,
      locked: true
    }))
    const approved = approveOutline(edited, 'lesson-01')
    const planned = planNodesFromOutline(approved, 'lesson-01')

    expect(planned.status).toBe('node_pending')
    expect(planned.lessons[0].nodes.length).toBeGreaterThan(1)
    expect(() => assembleFinalNote(planned, 'lesson-01')).toThrow(/approved/)

    const generated = planned.lessons[0].nodes.reduce((state, node) => {
      const drafted = updateNodeDraft(state, 'lesson-01', node.id, {
        markdown: `## ${node.title}\n\n基于来源材料生成的节点正文。`,
        reviewerReport: {
          coverage: 90,
          grounding: 90,
          logic: 90,
          detail: 90,
          sourceCoverage: 90,
          issues: [],
          decision: 'approve'
        }
      })
      return approveNode(drafted, 'lesson-01', node.id)
    }, planned)

    const assembled = assembleFinalNote(generated, 'lesson-01')
    expect(assembled.status).toBe('final_review')
    expect(assembled.lessons[0].finalNote.markdown).toContain('证据规则总论')
    expect(() => requireTransition(assembled, 'completed')).toThrow(/final review/)

    const final = completeFinalReview(assembled, 'lesson-01', {
      coverage: 90,
      grounding: 90,
      logic: 90,
      detail: 90,
      sourceCoverage: 90,
      issues: [],
      decision: 'approve'
    })
    expect(final.status).toBe('completed')
    expect(final.lessons[0].finalNote.qualityReport.decision).toBe('approve')
  })

  it('keeps failed and paused states observable without losing artifacts', () => {
    const workflow = saveCourseSpec(sampleWorkflow(), { goal: '自学' })
    const failed = failStep(workflow, {
      step: 'outline_generating',
      error: 'COURSE_AI_API_KEY missing',
      retryable: true
    })

    expect(failed.status).toBe('failed')
    expect(failed.errors[0].message).toContain('COURSE_AI_API_KEY')
    expect(failed.steps.find(step => step.key === 'outline_generating').status).toBe('failed')
    expect(failed.lessons[0].transcript).toContain('第一行')
  })
})
