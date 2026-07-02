import {
  estimateDeepseekUsageCost
} from '@/lib/ai/deepseekPricing'

describe('DeepSeek official pricing estimator', () => {
  it('prices cache hit, cache miss and output separately', () => {
    const result = estimateDeepseekUsageCost('deepseek-v4-pro', {
      prompt_tokens: 3000,
      prompt_cache_hit_tokens: 2000,
      prompt_cache_miss_tokens: 1000,
      completion_tokens: 500
    })
    expect(result.cacheHitTokens).toBe(2000)
    expect(result.cacheMissTokens).toBe(1000)
    expect(result.estimatedUsd).toBeCloseTo(
      2000 / 1_000_000 * 0.003625 +
      1000 / 1_000_000 * 0.435 +
      500 / 1_000_000 * 0.87,
      10
    )
    expect(result.estimatedCny).toBeCloseTo(
      result.estimatedUsd * 7.2,
      10
    )
  })

  it('does not pretend old unsplit input tokens have an exact cost', () => {
    const result = estimateDeepseekUsageCost('deepseek-v4-flash', {
      prompt_tokens: 3000,
      completion_tokens: 500
    })
    expect(result.unknownInputTokens).toBe(3000)
    expect(result.pricedInputTokens).toBe(0)
  })
})
