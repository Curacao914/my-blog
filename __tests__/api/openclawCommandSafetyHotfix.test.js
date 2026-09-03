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
    const compactCommand = command.replace(/\s+/g, ' ').trim()
    expect(compactCommand).toContain(
      'state.lastMutationObject || state.lastSelectedObject || null'
    )
    expect(compactCommand).not.toContain(
      'state.lastMutationObject || state.lastSelectedObject || state.lastObject'
    )
  })

  it('does not execute an incomplete time update', () => {
    expect(command).toContain('incompleteUpdateCommand')
    expect(command).toContain("reason: 'missing_update_value'")
    expect(command).toContain('referenceObject')
    expect(command).toContain('completesPendingUpdate')
  })

  it('blocks ambiguous mutations before generic capture', () => {
    expect(command).toContain('assessOpenClawMutation')
    expect(command).toContain("mutationPolicy.decision === 'ignore'")
    expect(command).toContain("mutationPolicy.decision === 'clarify'")
    const policyIndex = command.indexOf(
      'const mutationPolicy = assessOpenClawMutation({'
    )
    const captureCallIndex = command.indexOf(
      'forwardToCapture(req, {',
      policyIndex
    )
    expect(policyIndex).toBeGreaterThanOrEqual(0)
    expect(captureCallIndex).toBeGreaterThan(policyIndex)
  })

  it('lets the shared policy own unknown intent decisions', () => {
    expect(command).not.toContain(
      "if (classification.action === 'unknown')"
    )
    expect(command).not.toContain(
      '我还不能确定你想查询、添加还是修改什么'
    )
    expect(command).toContain(
      "mutationPolicy.decision === 'ignore'"
    )
    expect(command).toContain(
      "mutationPolicy.decision === 'clarify'"
    )
    expect(command).toContain(
      'Object.assign('
    )
    expect(command).toContain(
      'mutationPolicy.classification'
    )

    const normalizationIndex = command.indexOf(
      'Object.assign('
    )
    const protocolIndex = command.indexOf(
      'const protocol = buildSparseCommand({'
    )

    expect(normalizationIndex).toBeGreaterThanOrEqual(0)
    expect(protocolIndex).toBeGreaterThan(normalizationIndex)
  })

  it('marks no-op chat replies as silent', () => {
    expect(command).toContain('silent: true')
  })
})
