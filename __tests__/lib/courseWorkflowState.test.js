import {
  applyNodeReview,
  approveOutline,
  assembleFinalNote,
  completeFinalReview,
  createInitialWorkflow,
  failStep,
  mergeTextPackIntoWorkflow,
  planNodesFromOutline,
  recordNodeTaskFailure,
  retryNode,
  resumeWorkflow,
  saveCourseSpec,
  saveFinalNoteRevision,
  saveNodeDraft,
  startOutlineReview
} from '@/lib/course/workflowState'
import { buildTextPack } from '@/lib/course/textpack'

function sampleWorkflow(twoLessons = false) {
  const lessons = [
    { order: 1, title: '第1课', transcript: ['概念一', '概念二', '规则一', '案例一', '结论一'].join('\n') },
    ...(twoLessons ? [{ order: 2, title: '第2课', transcript: '第二课第一行\n第二课第二行' }] : [])
  ]
  const textPack = buildTextPack({ course: { name: '证据法', teacher: '张老师' }, lessons, decks: [] })
  return createInitialWorkflow({ textPack, courseName: '证据法', teacher: '张老师' })
}

function approveAllNodes(workflow, lessonKey) {
  const ids = workflow.lessons.find(lesson => lesson.key === lessonKey).nodes.map(node => node.id)
  return ids.reduce((state, id) => {
    const drafted = saveNodeDraft(state, lessonKey, id, `## ${id}\n\n基于来源形成的正文。`, { source: 'worker' })
    return applyNodeReview(drafted, lessonKey, id, {
      coverage: 90, grounding: 92, logic: 88, detail: 86, sourceCoverage: 90, issues: [], decision: 'approve'
    })
  }, workflow)
}

describe('controlled course workflow', () => {
  it('forces line-based splitting and automatically approves a current draft after reviewer approval', () => {
    let base = sampleWorkflow()
    base = { ...base, lessons: base.lessons.map(lesson => lesson.key === 'lesson-01' ? { ...lesson, transcript: Array.from({ length: 45 }, (_, index) => `第${index + 1}行`).join('\n') } : lesson) }
    const withSpec = saveCourseSpec(base, { nodeSplitThreshold: 99999, nodeSplitLineThreshold: 20, qualityThreshold: 75 })
    const outlined = startOutlineReview(withSpec, {
      lessonKey: 'lesson-01', mainLine: '证据规则',
      outline: [{ title: '全部内容', lineRange: [1, 45], slideRange: [1, 1], rationale: '完整覆盖', importance: 'high' }]
    })
    const planned = planNodesFromOutline(approveOutline(outlined, 'lesson-01'), 'lesson-01')
    expect(planned.lessons[0].nodes).toHaveLength(3)

    const first = planned.lessons[0].nodes[0]
    const drafted = saveNodeDraft(planned, 'lesson-01', first.id, '## 草稿\n\n正文', { source: 'worker' })
    expect(drafted.lessons[0].nodes[0].status).toBe('node_review')
    expect(drafted.lessons[0].status).toBe('node_pending')
    expect(drafted.status).toBe('node_pending')
    const reviewed = applyNodeReview(drafted, 'lesson-01', first.id, { coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90, issues: [], decision: 'approve' })
    expect(reviewed.lessons[0].nodes[0].status).toBe('node_approved')
    expect(reviewed.lessons[0].nodes[0].approvedAt).toBeTruthy()
  })

  it('keeps minor reviewer suggestions non-blocking', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75 })
    const outlined = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outlined, 'lesson-01'), 'lesson-01')
    const nodeId = planned.lessons[0].nodes[0].id
    const drafted = saveNodeDraft(planned, 'lesson-01', nodeId, '（一）总论 ★★\n\n课堂正文。', { source: 'writer' })
    const reviewed = applyNodeReview(drafted, 'lesson-01', nodeId, {
      coverage: 86, grounding: 90, logic: 87, detail: 82, sourceCoverage: 88,
      issues: [{ severity: 'suggestion', message: '可酌情补充冬奥会背景。' }], decision: 'revise'
    })
    expect(reviewed.lessons[0].nodes[0].status).toBe('node_approved')
    expect(reviewed.lessons[0].nodes[0].reviewerReports.at(-1).value.issues[0].severity).toBe('suggestion')
  })

  it('automatically queues substantive review failures and moves to human review only after the revision limit', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75, maxAutoRevisions: 1 })
    const outlined = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outlined, 'lesson-01'), 'lesson-01')
    const nodeId = planned.lessons[0].nodes[0].id
    const drafted = saveNodeDraft(planned, 'lesson-01', nodeId, '（一）总论 ★★\n\n课堂正文。', { source: 'writer' })
    const needsRevision = applyNodeReview(drafted, 'lesson-01', nodeId, {
      coverage: 80, grounding: 80, logic: 80, detail: 80, sourceCoverage: 80,
      issues: [{ severity: 'blocking', message: '教师观点被实质曲解。' }], decision: 'revise'
    })
    expect(needsRevision.lessons[0].nodes[0].status).toBe('node_revision_required')

    const revisedDraft = saveNodeDraft(needsRevision, 'lesson-01', nodeId, '（一）总论 ★★\n\n已按要求修订。', { source: 'revision' })
    const exhausted = applyNodeReview(revisedDraft, 'lesson-01', nodeId, {
      coverage: 80, grounding: 80, logic: 80, detail: 80, sourceCoverage: 80,
      issues: [{ severity: 'blocking', message: '仍存在实质问题。' }], decision: 'revise'
    })
    expect(exhausted.lessons[0].nodes[0].status).toBe('node_human_review')
    expect(exhausted.lessons[0].nodes[0].reviewerReports.at(-1).value.autoRevisionExhausted).toBe(true)
  })

  it('blocks downstream work only for structural review issues and automatically rechecks it after the source node passes', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75, maxAutoRevisions: 2 })
    const outlined = startOutlineReview(spec, {
      lessonKey: 'lesson-01',
      outline: [
        { id: 'section-1', title: '概念基础', lineRange: [1, 2], slideRange: [1, 1], rationale: '建立概念' },
        { id: 'section-2', title: '规则与案例', lineRange: [3, 5], slideRange: [1, 1], rationale: '展开规则' }
      ]
    })
    const planned = planNodesFromOutline(approveOutline(outlined, 'lesson-01'), 'lesson-01')
    const [firstId, secondId] = planned.lessons[0].nodes.map(node => node.id)
    const firstDraft = saveNodeDraft(planned, 'lesson-01', firstId, `（一）概念基础\n\n第一节点初稿。`, { source: 'writer' })
    const bothDrafted = saveNodeDraft(firstDraft, 'lesson-01', secondId, `（二）规则与案例\n\n第二节点初稿。`, { source: 'writer' })

    const blocked = applyNodeReview(bothDrafted, 'lesson-01', firstId, {
      coverage: 82, grounding: 82, logic: 82, detail: 82, sourceCoverage: 82,
      issues: [{ severity: 'blocking', impact: 'downstream', message: '核心概念理解错误，可能影响后文。' }],
      decision: 'revise'
    })
    const blockedNodes = blocked.lessons[0].nodes
    expect(blockedNodes[0].status).toBe('node_revision_required')
    expect(blockedNodes[0].blocksDownstream).toBe(true)
    expect(blockedNodes[1].blockedByNodeIds).toContain(firstId)
    expect(blockedNodes[1].reviewRequired).toBe(true)

    const revised = saveNodeDraft(blocked, 'lesson-01', firstId, `（一）概念基础\n\n第一节点已修正。`, { source: 'revision' })
    const released = applyNodeReview(revised, 'lesson-01', firstId, {
      coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90,
      issues: [], decision: 'approve'
    })
    const releasedNodes = released.lessons[0].nodes
    expect(releasedNodes[0].status).toBe('node_approved')
    expect(releasedNodes[0].blocksDownstream).toBe(false)
    expect(releasedNodes[1].blockedByNodeIds).toEqual([])
    expect(releasedNodes[1].status).toBe('node_review')
    expect(releasedNodes[1].reviewRequired).toBe(true)
    expect(releasedNodes[1].consistencyRequests.at(-1).sourceNodeId).toBe(firstId)
  })

  it('returns final-review revision to the cited node instead of failing the workflow', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75, nodeSplitLineThreshold: 200 })
    const outline = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outline, 'lesson-01'), 'lesson-01')
    const approved = approveAllNodes(planned, 'lesson-01')
    const assembled = assembleFinalNote(approved, 'lesson-01')
    const nodeId = assembled.lessons[0].nodes[0].id

    const revised = completeFinalReview(assembled, 'lesson-01', {
      coverage: 70, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90,
      issues: [{ nodeId, type: 'missing_content', severity: 'high', message: '需要补充论证。' }], decision: 'revise'
    })
    expect(revised.status).toBe('node_revision_required')
    expect(revised.lessons[0].nodes[0].status).toBe('node_revision_required')
    expect(revised.lessons[0].finalNote.stale).toBe(true)
  })

  it('advances from a completed first lesson to the second lesson', () => {
    const spec = saveCourseSpec(sampleWorkflow(true), { qualityThreshold: 75 })
    const outline = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '第一课', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outline, 'lesson-01'), 'lesson-01')
    const approved = approveAllNodes(planned, 'lesson-01')
    const assembled = assembleFinalNote(approved, 'lesson-01')
    const next = completeFinalReview(assembled, 'lesson-01', { coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90, issues: [], decision: 'approve' })

    expect(next.lessons[0].status).toBe('completed')
    expect(next.lessons[1].status).toBe('outline_pending')
    expect(next.status).toBe('outline_pending')
    expect(next.progress).toBeLessThan(100)
  })

  it('assembles the Skill course overview, section seams, quizzes, knowledge links and metadata without rewriting node bodies', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75 })
    const outline = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ id: 'section-1', title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '解释课程主线', concepts: ['证据'], statutes: ['《证据法》第1条'] }] })
    const planned = planNodesFromOutline(approveOutline(outline, 'lesson-01'), 'lesson-01')
    const nodeId = planned.lessons[0].nodes[0].id
    const body = '（一）证据的意义 ★★★\n\n这是一段不得被改写的节点正文。\n\nMETA_FOR_NODE:\n- CONCEPT: 证据\n- PROVISION: 证据法第1条'
    const drafted = saveNodeDraft(planned, 'lesson-01', nodeId, body, { source: 'writer' })
    const approved = applyNodeReview(drafted, 'lesson-01', nodeId, { coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90, issues: [], decision: 'approve' })
    const assembled = assembleFinalNote(approved, 'lesson-01', {
      courseOverview: { coreQuestions: ['证据为何重要？'], shouldBeAbleTo: ['解释证据的意义'], lectureThread: '本课沿证据的基本含义展开。' },
      sectionSummaries: { 'section-1': '本节建立全课的概念起点。' },
      sectionQuizzes: { 'section-1': ['如何解释证据的意义？'] },
      knowledgeLink: { laysGroundworkFor: [{ concept: '证据', use: '后续证明规则' }] },
      appendix: { terms: [{ term: '证据', original: 'evidence', definition: '见正文。' }] }
    })
    const markdown = assembled.lessons[0].finalNote.markdown
    expect(markdown).toContain('## 课程概览')
    expect(markdown).toContain('> **自测**')
    expect(markdown).toContain('## 知识连接')
    expect(markdown).toContain('## 附录')
    expect(markdown).toContain('这是一段不得被改写的节点正文。')
    expect(markdown).toContain('META: CONCEPT: 证据')
    expect(markdown).not.toContain('META_FOR_NODE')
    expect((markdown.match(/^\d+\. .+[?？]$/gm) || []).length).toBeGreaterThanOrEqual(3)
    expect((markdown.match(/^> \d+\. /gm) || []).length).toBeGreaterThanOrEqual(2)
    expect(assembled.lessons[0].finalNote.assembly.spliceData.courseOverview.lectureThread.length).toBeGreaterThanOrEqual(60)
  })

  it('isolates node task failures and lets the user retry only that node', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { maxTechnicalRetries: 0 })
    const outlined = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outlined, 'lesson-01'), 'lesson-01')
    const nodeId = planned.lessons[0].nodes[0].id
    const failed = recordNodeTaskFailure(planned, { lessonKey: 'lesson-01', nodeId, taskType: 'write-node', error: 'provider timeout' })
    expect(failed.status).not.toBe('failed')
    expect(failed.lessons[0].nodes[0].status).toBe('node_failed')
    const retried = retryNode(failed, 'lesson-01', nodeId)
    expect(retried.lessons[0].nodes[0].status).toBe('node_pending')
  })

  it('rejects outlines that leave source lines uncovered', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75 })
    expect(() => startOutlineReview(spec, {
      lessonKey: 'lesson-01',
      outline: [{ title: '不完整大纲', lineRange: [2, 4], slideRange: [1, 1], rationale: '遗漏首尾' }]
    })).toThrow(/start from transcript line 1|uncovered/)
  })

  it('archives the active failure on retry instead of presenting it as a new current error', () => {
    const workflow = { ...sampleWorkflow(), status: 'node_pending', currentStep: 'node_generating' }
    const failed = failStep(workflow, { step: 'write-node', error: '格式异常', taskKey: 'write:1' })
    const duplicate = failStep(failed, { step: 'write-node', error: '格式异常', taskKey: 'write:1' })
    expect(duplicate.errors).toHaveLength(1)
    expect(duplicate.activeErrorId).toBe(duplicate.errors[0].id)

    const resumed = resumeWorkflow(duplicate)
    expect(resumed.status).toBe('node_pending')
    expect(resumed.activeErrorId).toBeNull()
    expect(resumed.errors[0].resolvedAt).toBeTruthy()
    expect(resumed.taskLease).toBeNull()
  })

  it('adds supplemental material to the target lesson without recreating unrelated lessons', () => {
    const workflow = saveCourseSpec(sampleWorkflow(true), { qualityThreshold: 75 })
    const supplement = buildTextPack({
      course: { name: '证据法', teacher: '张老师' },
      lessons: [{ order: 1, key: 'lesson-01', title: '第1课', transcript: '补充讲义第一行\n补充讲义第二行' }],
      decks: [{ key: 'deck-extra', title: '补充课件', lessonOrder: 1, markdown: '补充课件内容', slides: [{ slideNumber: 1, text: '补充课件内容' }] }]
    })

    const merged = mergeTextPackIntoWorkflow(workflow, supplement)
    const first = merged.lessons.find(lesson => lesson.key === 'lesson-01')
    const second = merged.lessons.find(lesson => lesson.key === 'lesson-02')

    expect(first.transcript).toContain('补充讲义第一行')
    expect(first.pptText.some(deck => deck.title === '补充课件')).toBe(true)
    expect(first.status).toBe('outline_pending')
    expect(second.transcript).toContain('第二课第一行')
    expect(second.status).toBe('outline_pending')
    expect(merged.feedback.at(-1)).toEqual(expect.objectContaining({ type: 'materials-supplemented' }))
  })

  it('runs final review automatically and only falls back to a human after the automatic whole-note revision is exhausted', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75, maxFinalAutoRevisions: 1 })
    const outline = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outline, 'lesson-01'), 'lesson-01')
    const approved = approveAllNodes(planned, 'lesson-01')
    const assembled = assembleFinalNote(approved, 'lesson-01')

    expect(assembled.status).toBe('final_review')
    expect(assembled.lessons[0].status).toBe('final_review')

    const queued = completeFinalReview(assembled, 'lesson-01', {
      coverage: 70, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90,
      issues: [{ severity: 'high', message: '存在跨节点重复，需要统一整理。' }],
      decision: 'revise'
    })
    expect(queued.status).toBe('final_revision_required')
    expect(queued.lessons[0].finalReviewAttention).toBeNull()
    expect(queued.lessons[0].finalRevisionRequests.at(-1).value.source).toBe('final-review')

    const revised = saveFinalNoteRevision(queued, 'lesson-01', `${queued.lessons[0].finalNote.markdown}\n\n已统一跨节点表述。`)
    expect(revised.status).toBe('final_review')
    expect(revised.lessons[0].finalRevisionCount).toBe(1)

    const exhausted = completeFinalReview(revised, 'lesson-01', {
      coverage: 70, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90,
      issues: [{ severity: 'high', message: '仍存在无法定位的整体结构问题。' }],
      decision: 'revise'
    })
    expect(exhausted.status).toBe('final_review_human')
    expect(exhausted.lessons[0].finalReviewAttention).toEqual(expect.objectContaining({
      code: 'final-revision-exhausted',
      lessonKey: 'lesson-01'
    }))
  })

  it('keeps explicit source conflicts as an exceptional human-review state with a structured reason', () => {
    const spec = saveCourseSpec(sampleWorkflow(), { qualityThreshold: 75 })
    const outline = startOutlineReview(spec, { lessonKey: 'lesson-01', outline: [{ title: '总论', lineRange: [1, 5], slideRange: [1, 1], rationale: '主线' }] })
    const planned = planNodesFromOutline(approveOutline(outline, 'lesson-01'), 'lesson-01')
    const assembled = assembleFinalNote(approveAllNodes(planned, 'lesson-01'), 'lesson-01')
    const human = completeFinalReview(assembled, 'lesson-01', {
      coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90,
      issues: [{ severity: 'important', requiresHuman: true, message: '课堂转录与课件在核心结论上冲突。' }],
      decision: 'human_review'
    })

    expect(human.status).toBe('final_review_human')
    expect(human.lessons[0].finalReviewAttention.message).toContain('核心结论上冲突')
  })

})
