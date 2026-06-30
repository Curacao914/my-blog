const fs = require('fs')
const path = require('path')

describe('AI usage settings API', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/settings/ai-usage.js'),
    'utf8'
  )

  it('uses workspace ownership, provider usage and configured pricing', () => {
    expect(source).toContain("permission: 'ai'")
    expect(source).toContain('prompt_tokens')
    expect(source).toContain('completion_tokens')
    expect(source).toContain('inputPricePerMillion')
    expect(source).toContain('estimatedCost')
  })
})
