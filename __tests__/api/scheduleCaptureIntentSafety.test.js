const fs = require('fs')
const path = require('path')

describe('schedule capture semantic write gate', () => {
  const capture = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/schedule/capture.js'),
    'utf8'
  )
  const parse = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/schedule/parse.js'),
    'utf8'
  )
  const command = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/integrations/openclaw/command.js'),
    'utf8'
  )

  it('does not reference protocol before the temporal protocol is built', () => {
    const start = command.indexOf('const mutationPolicy = assessOpenClawMutation')
    const end = command.indexOf('const temporal = resolveTemporalSemantics', start)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    expect(command.slice(start, end)).not.toContain('protocol')
  })

  it('gates capture before model parsing and database writes', () => {
    expect(capture).toContain("assessCaptureIntent({ text: originalCommand })")
    expect(capture).toContain("captureIntent.decision === 'ignore'")
    expect(capture).toContain("captureIntent.decision === 'clarify'")
    expect(capture.indexOf('assessCaptureIntent({ text: originalCommand })'))
      .toBeLessThan(capture.indexOf('ensureProfile({ clerkUserId'))
  })

  it('lets the model explicitly choose write, ignore or clarify', () => {
    expect(parse).toContain('"decision": "write | ignore | clarify"')
    expect(parse).toContain("decision !== 'write'")
    expect(parse).toContain("reason: 'write_without_items'")
  })

  it('does not revive an intentional empty model result with fallback rules', () => {
    expect(parse).not.toContain(
      'const safeItems = items.length ? items : fallbackItemsFromCommand'
    )
    expect(parse).toContain("if (decision !== 'write')")
  })

  it('contains the reported regression example in the semantic prompt', () => {
    expect(parse).toContain('未读课程简报已全部读完')
    expect(parse).toContain('不要只因出现“读、完成、提醒、课程”等关键词就写入')
  })

  it('uses shared semantic reading intent instead of a broad reading regex', () => {
    expect(parse).toContain('hasExplicitReadingIntent')
    expect(parse).not.toContain(
      '/(?:加入|添加|保存|放进|列入).{0,8}(?:阅读|待读)/'
    )
  })
})
