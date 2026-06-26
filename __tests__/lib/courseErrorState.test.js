import { formatCourseWorkflowError, getCourseErrorHistory, getCurrentCourseError } from '@/lib/course/errorState'

describe('course error state', () => {
  it('separates the current failure from resolved history and removes duplicate history rows', () => {
    const workflow = {
      status: 'failed',
      activeErrorId: 'error-current',
      errors: [
        { id: 'error-old-1', step: 'generate-outline', message: '覆盖缺口', resolvedAt: '2026-06-26T00:00:00.000Z' },
        { id: 'error-old-2', step: 'generate-outline', message: '覆盖缺口', resolvedAt: '2026-06-26T01:00:00.000Z' },
        { id: 'error-current', step: 'review-node', message: '格式异常' }
      ]
    }

    expect(getCurrentCourseError(workflow)?.id).toBe('error-current')
    expect(getCourseErrorHistory(workflow)).toHaveLength(1)
    expect(formatCourseWorkflowError(getCurrentCourseError(workflow))).toBe('格式异常 · 阶段：审查正文')
  })

  it('does not treat old errors as active after the workflow resumes', () => {
    const workflow = { status: 'node_pending', errors: [{ id: 'old', step: 'write-node', message: '旧错误', resolvedAt: '2026-06-26T00:00:00.000Z' }] }
    expect(getCurrentCourseError(workflow)).toBeNull()
    expect(getCourseErrorHistory(workflow)).toHaveLength(1)
  })
})
