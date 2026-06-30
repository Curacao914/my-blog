export const DEEPSEEK_PRICING_VERSION = '2026-06-30'

export const DEEPSEEK_PRICING_URL =
  'https://api-docs.deepseek.com/quick_start/pricing/'

export const DEFAULT_USD_CNY_RATE = 7.2

const PRICES = Object.freeze({
  'deepseek-v4-flash': Object.freeze({
    label: 'DeepSeek V4 Flash',
    cacheHitPerMillionUsd: 0.0028,
    cacheMissPerMillionUsd: 0.14,
    outputPerMillionUsd: 0.28
  }),
  'deepseek-v4-pro': Object.freeze({
    label: 'DeepSeek V4 Pro',
    cacheHitPerMillionUsd: 0.003625,
    cacheMissPerMillionUsd: 0.435,
    outputPerMillionUsd: 0.87
  })
})

function canonicalModel(value = '') {
  const model = String(value || '').trim().toLowerCase()
  if (model === 'deepseek-chat' || model === 'deepseek-reasoner') {
    return 'deepseek-v4-flash'
  }
  if (model.includes('deepseek-v4-pro')) return 'deepseek-v4-pro'
  if (model.includes('deepseek-v4-flash')) return 'deepseek-v4-flash'
  return ''
}

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

export function deepseekPriceForModel(model = '') {
  const canonical = canonicalModel(model)
  return canonical ? { model: canonical, ...PRICES[canonical] } : null
}

export function normalizeDeepseekUsage(usage = {}) {
  const promptTokens = finite(
    usage.prompt_tokens ??
    usage.input_tokens ??
    usage.promptTokens ??
    usage.inputTokens
  )
  const cacheHitTokens = finite(
    usage.prompt_cache_hit_tokens ??
    usage.promptCacheHitTokens
  )
  const cacheMissTokens = finite(
    usage.prompt_cache_miss_tokens ??
    usage.promptCacheMissTokens
  )
  const outputTokens = finite(
    usage.completion_tokens ??
    usage.output_tokens ??
    usage.completionTokens ??
    usage.outputTokens
  )
  const reasoningTokens = finite(
    usage.completion_tokens_details?.reasoning_tokens ??
    usage.output_tokens_details?.reasoning_tokens ??
    usage.reasoning_tokens
  )
  const hasCacheBreakdown =
    Object.prototype.hasOwnProperty.call(usage, 'prompt_cache_hit_tokens') ||
    Object.prototype.hasOwnProperty.call(usage, 'promptCacheHitTokens') ||
    Object.prototype.hasOwnProperty.call(usage, 'prompt_cache_miss_tokens') ||
    Object.prototype.hasOwnProperty.call(usage, 'promptCacheMissTokens')

  return {
    promptTokens,
    cacheHitTokens,
    cacheMissTokens,
    outputTokens,
    reasoningTokens,
    hasCacheBreakdown,
    unknownInputTokens: hasCacheBreakdown
      ? Math.max(0, promptTokens - cacheHitTokens - cacheMissTokens)
      : promptTokens
  }
}

export function estimateDeepseekUsageCost(
  model,
  usage = {},
  { usdCnyRate = DEFAULT_USD_CNY_RATE } = {}
) {
  const pricing = deepseekPriceForModel(model)
  const exchangeRate =
    Number.isFinite(Number(usdCnyRate)) && Number(usdCnyRate) > 0
      ? Number(usdCnyRate)
      : DEFAULT_USD_CNY_RATE
  const normalized = normalizeDeepseekUsage(usage)
  if (!pricing) {
    return {
      ...normalized,
      supported: false,
      model: String(model || ''),
      estimatedUsd: 0,
      estimatedCny: 0,
      usdCnyRate: exchangeRate,
      pricedInputTokens: 0,
      pricing: null
    }
  }

  const pricedInputTokens = normalized.hasCacheBreakdown
    ? normalized.cacheHitTokens + normalized.cacheMissTokens
    : 0
  const estimatedUsd =
    (normalized.cacheHitTokens / 1_000_000) *
      pricing.cacheHitPerMillionUsd +
    (normalized.cacheMissTokens / 1_000_000) *
      pricing.cacheMissPerMillionUsd +
    (normalized.outputTokens / 1_000_000) *
      pricing.outputPerMillionUsd

  return {
    ...normalized,
    supported: true,
    model: pricing.model,
    label: pricing.label,
    estimatedUsd,
    estimatedCny: estimatedUsd * exchangeRate,
    usdCnyRate: exchangeRate,
    pricedInputTokens,
    pricing
  }
}

export function deepseekPricingRows(
  usdCnyRate = DEFAULT_USD_CNY_RATE
) {
  const exchangeRate =
    Number.isFinite(Number(usdCnyRate)) && Number(usdCnyRate) > 0
      ? Number(usdCnyRate)
      : DEFAULT_USD_CNY_RATE
  return Object.entries(PRICES).map(([model, pricing]) => ({
    model,
    ...pricing,
    cacheHitPerMillionCny:
      pricing.cacheHitPerMillionUsd * exchangeRate,
    cacheMissPerMillionCny:
      pricing.cacheMissPerMillionUsd * exchangeRate,
    outputPerMillionCny:
      pricing.outputPerMillionUsd * exchangeRate
  }))
}
