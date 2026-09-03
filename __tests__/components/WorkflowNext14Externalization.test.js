const fs = require('fs')
const path = require('path')

describe('Workflow Next 14 server externalization', () => {
  const config = fs.readFileSync(
    path.join(process.cwd(), 'next.config.js'),
    'utf8'
  )

  it('keeps native-prone Workflow queue dependencies outside server chunks', () => {
    expect(config).toContain('WORKFLOW_NATIVE_SERVER_EXTERNALS')
    expect(config).toContain("'@vercel/queue'")
    expect(config).toContain("'@vercel/oidc'")
    expect(config).toContain("'@vercel/cli-auth'")
    expect(config).toContain("'@napi-rs/keyring'")
    expect(config).toContain(
      'serverComponentsExternalPackages: WORKFLOW_NATIVE_SERVER_EXTERNALS'
    )
    expect(config).toContain('if (isServer)')
    expect(config).toContain('config.externals = [')
  })
})
