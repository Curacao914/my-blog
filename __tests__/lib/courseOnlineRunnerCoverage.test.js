import { executeCourseTask, findOutlineCoverageGaps, numberTranscript, splicePlaceholderContext, transcriptLines } from '@/lib/course/onlineRunner'

describe('course outline source coverage helpers', () => {
  test('numbers normalized transcript lines with stable absolute labels', () => {
    const source = '第一行\n\n第二行\n第三行'
    expect(transcriptLines(source)).toEqual(['第一行', '第二行', '第三行'])
    expect(numberTranscript(source)).toBe('[L1] 第一行\n[L2] 第二行\n[L3] 第三行')
    expect(numberTranscript(source, [2, 3])).toBe('[L2] 第二行\n[L3] 第三行')
  })

  test('finds internal and trailing outline coverage gaps', () => {
    const outline = [
      { lineRange: [1, 530] },
      { lineRange: [2002, 2100] }
    ]
    expect(findOutlineCoverageGaps(outline, 2200)).toEqual([
      [531, 2001],
      [2101, 2200]
    ])
  })

  test('overlapping ranges do not create false gaps', () => {
    const outline = [
      { lineRange: [1, 100] },
      { lineRange: [80, 200] }
    ]
    expect(findOutlineCoverageGaps(outline, 200)).toEqual([])
  })

  test('builds splice placeholder context without exposing approved node bodies to the splice model', () => {
    const context = splicePlaceholderContext({
      title: '国际法第一课',
      outline: [{ id: 'o1', title: '国际法的广泛性' }],
      nodes: [{ id: 'n1', outlineNodeId: 'o1', title: '国际法的广泛性 · 1/1', draft: '这段已批准正文绝不能交给接缝模型改写。' }]
    })
    expect(context).toContain('{{COURSE_OVERVIEW}}')
    expect(context).toContain('{{H1_SUMMARY:o1}}')
    expect(context).toContain('国际法的广泛性 · 1/1')
    expect(context).not.toContain('这段已批准正文绝不能交给接缝模型改写。')
  })

  test('reconciles a stored current final review without calling the model again', async () => {
    const report = {
      decision: 'approve',
      reviewedDraftVersion: 3,
      coverage: 90,
      grounding: 90,
      logic: 90,
      detail: 90,
      sourceCoverage: 90,
      issues: []
    }
    await expect(executeCourseTask({
      type: 'reconcile-final-review',
      lessonKey: 'lesson-01',
      taskKey: 'reconcile-final-review:lesson-01:version-3:report-1',
      qualityReport: report
    })).resolves.toEqual({
      type: 'complete-final-review',
      lessonKey: 'lesson-01',
      taskKey: 'reconcile-final-review:lesson-01:version-3:report-1',
      qualityReport: report
    })
  })
})
