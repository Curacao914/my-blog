const fs = require('fs')
const path = require('path')

describe('OpenClaw context safety hotfix', () => {
  const command = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/integrations/openclaw/command.js'),
    'utf8'
  )

  it('keeps query results separate from the latest mutated object', () => {
    expect(command).toContain('lastMutationObject')
    expect(command).toContain('lastQueryObject: queryResult.lastObject')
    expect(command).toContain('lastSelectedObject')
    expect(command).not.toContain(
      'state.lastMutationObject ||\\n              state.lastSelectedObject ||\\n              state.lastObject'
    )
  })

  it('does not execute an incomplete time update', () => {
    expect(command).toContain('incompleteUpdateCommand')
    expect(command).toContain("reason: 'missing_update_value'")
    expect(command).toContain('referenceObject')
    expect(command).toContain('completesPendingUpdate')
  })

  it('marks no-op chat replies as silent', () => {
    expect(command).toContain('silent: true')
  })
})
