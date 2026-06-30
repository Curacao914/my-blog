const fs = require('fs')
const path = require('path')

describe('AI usage settings API', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/settings/ai-usage.js'),
    'utf8'
  )

  it('uses DeepSeek cache split and official-price estimator', () => {
    expect(source).toContain("permission: 'ai'")
    expect(source).toContain('estimateDeepseekUsageCost')
    expect(source).toContain('cacheHitTokens')
    expect(source).toContain('cacheMissTokens')
    expect(source).toContain('estimatedUsd')
  })
})
