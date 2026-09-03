const fs = require('fs')
const path = require('path')

describe('course publication source compatibility', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'lib/db/schema.sql'), 'utf8')
  const model = fs.readFileSync(path.join(process.cwd(), 'lib/contentPublishingModel.js'), 'utf8')
  const management = fs.readFileSync(path.join(process.cwd(), 'lib/contentManagement.js'), 'utf8')

  it('writes a source value accepted by the deployed content_items constraint', () => {
    expect(schema).toContain("'course-worker'")
    expect(model).toContain("COURSE_CONTENT_SOURCE = 'course-worker'")
    expect(model).toContain('source: COURSE_CONTENT_SOURCE')
  })

  it('can still find records created by the short-lived course-workflow implementation', () => {
    expect(model).toContain("LEGACY_COURSE_CONTENT_SOURCE = 'course-workflow'")
    expect(management).toContain('source=in.(${sourceFilter})')
  })
})
