const { executeTask, validateReview } = require('../../scripts/course-worker/run-job.js')

describe('course worker runtime', () => {
  it('keeps deterministic writer and reviewer as separate actions', async () => {
    const node = { id: 'node-1', title: '规则', sourceText: '来源', draft: '', versions: [], reviewerReports: [] }
    const write = await executeTask({ type: 'write-node', taskKey: 'write-1', lessonKey: 'lesson-01', node }, { deterministic: true })
    expect(write.type).toBe('save-node-draft-worker')
    expect(write.reviewerReport).toBeUndefined()

    const review = await executeTask({ type: 'review-node', taskKey: 'review-1', lessonKey: 'lesson-01', node: { ...node, draft: write.markdown } }, { deterministic: true })
    expect(review.type).toBe('save-node-review')
    expect(review.reviewerReport.decision).toBe('approve')
  })

  it('validates structured reviewer output', () => {
    expect(validateReview({ coverage: 90, grounding: 90, logic: 90, detail: 90, sourceCoverage: 90, issues: [], decision: 'approve' }).decision).toBe('approve')
    expect(() => validateReview({ decision: 'great' })).toThrow(/decision/)
  })
})
