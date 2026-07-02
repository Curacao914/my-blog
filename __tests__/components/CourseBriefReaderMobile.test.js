const fs = require('fs')
const path = require('path')

describe('course brief reader mobile layout', () => {
  const component = fs.readFileSync(
    path.join(process.cwd(), 'components/CourseBriefReader.js'),
    'utf8'
  )

  it('keeps the reading navigator in normal document flow on mobile', () => {
    expect(component).toContain('.course-brief-reader .course-note-toc')
    expect(component).toContain('position: static')
    expect(component).toContain('order: 2')
  })

  it('stacks or evenly sizes reader actions without horizontal overflow', () => {
    expect(component).toContain("className='course-note-full-link'")
    expect(component).toContain(
      'grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)'
    )
    expect(component).toContain('@media (max-width: 420px)')
  })

  it('contains long markdown and media inside the viewport', () => {
    expect(component).toContain('overflow-wrap: anywhere')
    expect(component).toContain('max-width: 100%')
    expect(component).toContain('overflow: hidden')
  })
})
