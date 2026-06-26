import { getCourseUiState } from '@/lib/course/uiState'

describe('course product UI state', () => {
  it('maps internal preflight state to a single user action', () => {
    const workflow = { status: 'preflight_required', lessons: [], errors: [] }
    const lesson = { status: 'preflight_required', nodes: [] }
    const ui = getCourseUiState(workflow, lesson)
    expect(ui.stage).toBe('preferences')
    expect(ui.primaryAction).toEqual(expect.objectContaining({ type: 'save-course-spec' }))
    expect(ui.stages.filter(stage => stage.current)).toHaveLength(1)
  })

  it('explains revision and final human review without treating quality feedback as a crash', () => {
    const revision = getCourseUiState({ status: 'node_revision_required', errors: [] }, { status: 'node_revision_required', nodes: [{ status: 'node_revision_required' }] })
    expect(revision.stage).toBe('review')
    expect(revision.primaryAction.label).toContain('修改')

    const final = getCourseUiState({ status: 'final_review_human', errors: [] }, { status: 'final_review_human', nodes: [] })
    expect(final.stage).toBe('assemble')
    expect(final.primaryAction.type).toBe('approve-final-review')
  })
})
