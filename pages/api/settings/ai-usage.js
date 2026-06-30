import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  DEFAULT_USD_CNY_RATE,
  DEEPSEEK_PRICING_VERSION,
  DEEPSEEK_PRICING_URL,
  deepseekPricingRows,
  estimateDeepseekUsageCost
} from '@/lib/ai/deepseekPricing'
import { supabaseRest } from '@/lib/server/supabase'

const DAYS = 30

function traceKey(trace = {}) {
  return [
    trace.startedAt,
    trace.endedAt,
    trace.role,
    trace.model,
    trace.promptChars,
    trace.completionChars
  ].join('|')
}

function collectTraces(value, traces, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return
  if (seen.has(value)) return
  seen.add(value)

  if (
    !Array.isArray(value) &&
    value.role &&
    value.model &&
    (value.startedAt || value.usage)
  ) {
    traces.push(value)
  }

  Object.values(value).forEach(child => {
    if (child && typeof child === 'object') collectTraces(child, traces, seen)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireWorkspaceRequest(req, { permission: 'ai' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  try {
    const configuredRate = Number(
      process.env.DEEPSEEK_USD_CNY_RATE ||
      DEFAULT_USD_CNY_RATE
    )
    const usdCnyRate =
      Number.isFinite(configuredRate) && configuredRate > 0
        ? configuredRate
        : DEFAULT_USD_CNY_RATE
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
    const owner = encodeURIComponent(auth.profile.id)
    const jobs = await supabaseRest(
      `/course_jobs?select=id,course_name,preprocess_result,updated_at&owner_id=eq.${owner}&updated_at=gte.${encodeURIComponent(since.toISOString())}&order=updated_at.desc&limit=80`
    )

    const collected = []
    ;(jobs || []).forEach(job => {
      const traces = []
      collectTraces(job.preprocess_result, traces)
      traces.forEach(trace => collected.push({
        ...trace,
        jobId: job.id,
        courseName: job.course_name || ''
      }))
    })

    const seen = new Set()
    const traces = collected.filter(trace => {
      const key = traceKey(trace)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const groups = new Map()
    const totals = {
      calls: 0,
      cacheHitTokens: 0,
      cacheMissTokens: 0,
      unknownInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      estimatedUsd: 0,
      estimatedCny: 0,
      unsupportedCalls: 0,
      missingUsageCalls: 0
    }

    traces.forEach(trace => {
      const result = estimateDeepseekUsageCost(
        trace.model,
        trace.usage || {},
        { usdCnyRate }
      )
      totals.calls += 1
      totals.cacheHitTokens += result.cacheHitTokens
      totals.cacheMissTokens += result.cacheMissTokens
      totals.unknownInputTokens += result.unknownInputTokens
      totals.outputTokens += result.outputTokens
      totals.reasoningTokens += result.reasoningTokens
      totals.estimatedUsd += result.estimatedUsd
      totals.estimatedCny += result.estimatedCny
      if (!result.supported) totals.unsupportedCalls += 1
      if (!trace.usage) totals.missingUsageCalls += 1

      const key = `${trace.model || 'unknown'}|${trace.role || 'unknown'}`
      const current = groups.get(key) || {
        model: trace.model || 'unknown',
        canonicalModel: result.model || '',
        role: trace.role || 'unknown',
        calls: 0,
        cacheHitTokens: 0,
        cacheMissTokens: 0,
        unknownInputTokens: 0,
        outputTokens: 0,
        estimatedUsd: 0,
        estimatedCny: 0
      }
      current.calls += 1
      current.cacheHitTokens += result.cacheHitTokens
      current.cacheMissTokens += result.cacheMissTokens
      current.unknownInputTokens += result.unknownInputTokens
      current.outputTokens += result.outputTokens
      current.estimatedUsd += result.estimatedUsd
      current.estimatedCny += result.estimatedCny
      groups.set(key, current)
    })

    const pricedInput =
      totals.cacheHitTokens + totals.cacheMissTokens
    const cacheHitRate = pricedInput
      ? totals.cacheHitTokens / pricedInput
      : 0

    return res.status(200).json({
      ok: true,
      windowDays: DAYS,
      pricingVersion: DEEPSEEK_PRICING_VERSION,
      pricingUrl: DEEPSEEK_PRICING_URL,
      currency: 'CNY',
      usdCnyRate,
      pricing: deepseekPricingRows(usdCnyRate),
      ...totals,
      cacheHitRate,
      groups: [...groups.values()].sort(
        (left, right) =>
          right.estimatedCny - left.estimatedCny ||
          right.calls - left.calls
      )
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'AI usage query failed'
    })
  }
}
