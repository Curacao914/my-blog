const fs = require('fs')
const path = require('path')

describe('WeChat capture AI routing', () => {
  const capture = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/schedule/capture.js'),
    'utf8'
  )
  const parse = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/schedule/parse.js'),
    'utf8'
  )

  it('uses the owner personal AI configuration', () => {
    expect(capture).toContain('resolveUserAiConfig(profile)')
    expect(capture).toContain('runScheduleParse')
  })

  it('does not spend a model call on greetings', () => {
    expect(capture).toContain('shouldIgnoreCommand(command)')
    expect(parse).toContain('if (shouldIgnoreCommand(command))')
  })

  it('does not retry billing failures without response_format', () => {
    expect(parse).toContain('[400, 404, 415, 422]')
    expect(parse).toContain('providerStatus')
  })
})
