const fs = require('fs')
const path = require('path')

describe('OpenClaw runtime integration', () => {
  const settings = fs.readFileSync(
    path.join(process.cwd(), 'components/AiSettings.js'),
    'utf8'
  )
  const runtime = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/integrations/openclaw/runtime-config.js'),
    'utf8'
  )
  const heartbeat = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/integrations/openclaw/heartbeat.js'),
    'utf8'
  )

  it('lets the owner choose a DeepSeek OpenClaw model', () => {
    expect(settings).toContain('OpenClaw 默认模型')
    expect(settings).toContain('deepseek/deepseek-v4-flash')
    expect(settings).toContain('openclawSyncEnabled')
  })

  it('returns only desired runtime metadata to the relay', () => {
    expect(runtime).toContain('resolveOpenClawRuntimePreference')
    expect(runtime).not.toContain('decryptUserSecret')
  })

  it('records local relay health without exposing credentials', () => {
    expect(heartbeat).toContain('relayLastSeenAt')
    expect(heartbeat).toContain('relayCurrentModel')
  })
})
