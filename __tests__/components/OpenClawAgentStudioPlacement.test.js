const fs = require('fs')
const path = require('path')

describe('Agent Studio placement', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/SystemDesk.js'),
    'utf8'
  )

  it('exposes Agent Studio only in the owner site group', () => {
    expect(source).toContain("import { OpenClawAgentStudio }")
    expect(source).toContain("{ key: 'agent-studio', label: 'Agent Studio' }")
    expect(source).toContain("section === 'agent-studio' && isOwnerView")
  })
})
