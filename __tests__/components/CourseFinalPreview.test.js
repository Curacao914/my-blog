import fs from 'fs'
import path from 'path'

const desk = fs.readFileSync(path.join(process.cwd(), 'components/CourseTextPackDesk.js'), 'utf8')
const workflow = fs.readFileSync(path.join(process.cwd(), 'lib/course/workflowState.js'), 'utf8')

describe('course final note reading view', () => {
  it('renders Markdown and keeps explicit save, revision and exceptional-review actions', () => {
    expect(desk).toContain('ReactMarkdown')
    expect(desk).toContain('countCourseNoteChars')
    expect(desk).toContain("type: 'save-final-note'")
    expect(desk).toContain("type: 'request-final-revision'")
    expect(desk).toContain("type: 'approve-final-review'")
    expect(desk).toContain('正常通过后会自动完成，无需确认')
    expect(workflow).toContain("status: 'final_review'")
    expect(workflow).toContain('completeFinalReview')
  })
})
