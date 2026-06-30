import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  getUserIntegration
} from '@/lib/server/userIntegrations'
import { supabaseRest } from '@/lib/server/supabase'

const DAYS = 30

function number(value) {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

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

function collectTraces(value, traces, seenObjects = new WeakSet()) {
  if (!value || typeof value !== 'object') return
  if (seenObjects.has(value)) return
  seenObjects.add(value)

  if (
    !Array.isArray(value) &&
    value.role &&
    value.model &&
    (value.startedAt || value.usage)
  ) {
    traces.push(value)
  }

  Object.values(value).forEach(child => {
    if (child && typeof child === 'object') {
      collectTraces(child, traces, seenObjects)
    }
  })
}

function normalizeUsage(trace = {}) {
  const usage = trace.usage || {}
  const inputTokens = number(
    usage.prompt_tokens ??
    usage.input_tokens ??
    usage.promptTokens ??
    usage.inputTokens
  )
  const outputTokens = number(
    usage.completion_tokens ??
    usage.output_tokens ??
    usage.completionTokens ??
    usage.outputTokens
  )
  const totalTokens = number(
    usage.total_tokens ??
    usage.totalTokens ??
    inputTokens + outputTokens
  )
  return { inputTokens, outputTokens, totalTokens }
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
    const since = new Date(
      Date.now() - DAYS * 24 * 60 * 60 * 1000
    )
    const owner = encodeURIComponent(auth.profile.id)
    const jobs = await supabaseRest(
      `/course_jobs?select=id,course_name,preprocess_result,updated_at&owner_id=eq.${owner}&updated_at=gte.${encodeURIComponent(since.toISOString())}&order=updated_at.desc&limit=80`
    )
    const integration = await getUserIntegration(
      auth.profile.id,
      'openai-compatible'
    )
    const config = integration?.config || {}
    const inputPrice = number(config.inputPricePerMillion)
    const outputPrice = number(config.outputPricePerMillion)

    const all = []
    ;(jobs || []).forEach(job => {
      const traces = []
      collectTraces(job.preprocess_result, traces)
      traces.forEach(trace => {
        all.push({
          ...trace,
          jobId: job.id,
          courseName: job.course_name || ''
        })
      })
    })

    const unique = []
    const keys = new Set()
    all.forEach(trace => {
      const key = traceKey(trace)
      if (keys.has(key)) return
      keys.add(key)
      unique.push(trace)
    })

    const grouped = new Map()
    let inputTokens = 0
    let outputTokens = 0
    let totalTokens = 0
    let unmeteredCalls = 0

    unique.forEach(trace => {
      const usage = normalizeUsage(trace)
      inputTokens += usage.inputTokens
      outputTokens += usage.outputTokens
      totalTokens += usage.totalTokens
      if (!usage.totalTokens) unmeteredCalls += 1

      const key = `${trace.model || 'unknown'}|${trace.role || 'unknown'}`
      const current = grouped.get(key) || {
        model: trace.model || 'unknown',
        role: trace.role || 'unknown',
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      }
      current.calls += 1
      current.inputTokens += usage.inputTokens
      current.outputTokens += usage.outputTokens
      current.totalTokens += usage.totalTokens
      grouped.set(key, current)
    })

    const estimatedCost =
      (inputTokens / 1_000_000) * inputPrice +
      (outputTokens / 1_000_000) * outputPrice

    return res.status(200).json({
      ok: true,
      windowDays: DAYS,
      calls: unique.length,
      unmeteredCalls,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      currency: 'CNY',
      pricing: {
        inputPricePerMillion: inputPrice,
        outputPricePerMillion: outputPrice,
        configured: inputPrice > 0 || outputPrice > 0
      },
      groups: [...grouped.values()].sort(
        (left, right) =>
          right.totalTokens - left.totalTokens ||
          right.calls - left.calls
      )
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'AI usage query failed'
    })
  }
}
