const fs = require('fs')
const path = require('path')

describe('OpenClaw command core endpoint', () => {
  const command = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/integrations/openclaw/command.js'),
    'utf8'
  )
  const capture = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/schedule/capture.js'),
    'utf8'
  )
  const conversation = fs.readFileSync(
    path.join(process.cwd(), 'lib/server/openclawConversation.js'),
    'utf8'
  )

  it('routes writes through the existing capture API without duplicating persistence logic', () => {
    expect(command).toContain('/api/schedule/capture')
    expect(command).toContain('forwardToCapture')
  })

  it('passes a deterministic resolved command into capture', () => {
    expect(command).toContain('resolvedCommandForCapture')
    expect(command).toContain('resolvedCommand,')
    expect(capture).toContain('applyResolvedScheduleCommand')
    expect(capture).toContain('req.body?.resolvedCommand')
  })

  it('blocks queries from accidentally writing through the capture API', () => {
    expect(command).toContain('if (isQueryAction(classification.action))')
    expect(command).toContain('executeOpenClawQuery')
    expect(command).toContain('candidates: queryResult.candidates')
  })

  it('uses short-lived transactional context instead of delaying messages for batching', () => {
    expect(conversation).toContain('10 * 60 * 1000')
    expect(command).not.toContain('30_000')
    expect(command).not.toContain('setTimeout')
  })

  it('requires clarification for past times and confirmation for destructive writes', () => {
    expect(command).toContain('temporal.needsClarification')
    expect(command).toContain("reason: 'temporal_ambiguity'")
    expect(command).toContain("reason: 'destructive_confirmation'")
    expect(command).toContain("classification.confirmation === 'explicit'")
  })

  it('returns the saved item so the next turn can reference its exact time', () => {
    expect(capture).toContain('item: savedItem')
    expect(command).toContain('lastObjectFromPayload')
  })
})
