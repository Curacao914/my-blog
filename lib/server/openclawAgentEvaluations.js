import crypto from 'crypto'

import {
  buildEvaluationReport,
  FIXED_EVALUATION_CASES,
  publishingGate
} from '@/lib/openclaw/agent-v2/evaluation'
import { validateAgentEnvironment } from '@/lib/server/openclawAgentConfigs'
import { encryptUserSecret } from '@/lib/server/secretCrypto'
import { supabaseRest } from '@/lib/server/supabase'

const RUN_SELECT = [
  'id', 'owner_id', 'environment', 'config_id', 'suite', 'model',
  'status', 'case_count', 'overall_score', 'safety_score',
  'dimension_scores', 'usage', 'estimated_cost_usd', 'latency_ms',
  'failure_categories', 'created_at', 'completed_at'
].join(',')

function eq(value) {
  return `eq.${encodeURIComponent(value)}`
}

function requireOwner(ownerId) {
  if (!ownerId) throw new Error('Agent evaluation ownerId is required')
}

function checksum(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function compactFailureCategories(failures = []) {
  const summaries = new Map()
  ;(Array.isArray(failures) ? failures : []).forEach(failure => {
    const category = String(failure?.category || 'unknown_failure')
    const current = summaries.get(category) || {
      category,
      count: 0,
      critical: false
    }
    current.count += 1
    current.critical = current.critical || Boolean(failure?.critical)
    if (!current.message && failure?.message) {
      current.message = String(failure.message).slice(0, 300)
    }
    summaries.set(category, current)
  })
  return [...summaries.values()]
}

function compactRun(row) {
  if (!row) return row
  return {
    ...row,
    failure_categories: compactFailureCategories(row.failure_categories)
  }
}

export async function syncFixedEvaluationCases({ ownerId, environment }) {
  requireOwner(ownerId)
  validateAgentEnvironment(environment)
  const rows = FIXED_EVALUATION_CASES.map(item => {
    const encrypted = encryptUserSecret(item.input)
    return {
      owner_id: ownerId,
      environment,
      suite: item.suite,
      case_key: item.id,
      partition: item.partition,
      tags: item.tags,
      input_ciphertext: encrypted.ciphertext,
      input_iv: encrypted.iv,
      input_tag: encrypted.tag,
      expected: item.expected,
      checksum: checksum(JSON.stringify({ input: item.input, expected: item.expected })),
      updated_at: new Date().toISOString()
    }
  })
  return supabaseRest(
    '/openclaw_agent_eval_cases' +
    '?on_conflict=owner_id,environment,suite,case_key&select=id,case_key,partition',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(rows)
    }
  )
}

export async function createEvaluationRun({
  ownerId,
  environment,
  configId,
  model,
  suite = 'agent-v2-fixed-1'
}) {
  requireOwner(ownerId)
  validateAgentEnvironment(environment)
  const rows = await supabaseRest(`/openclaw_agent_eval_runs?select=${RUN_SELECT}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      owner_id: ownerId,
      environment,
      config_id: configId,
      suite,
      model,
      status: 'running'
    })
  })
  return rows?.[0] || null
}

export async function listEvaluationRuns({ ownerId, environment, limit = 20 }) {
  requireOwner(ownerId)
  validateAgentEnvironment(environment)
  const rows = await supabaseRest(
    `/openclaw_agent_eval_runs?select=${RUN_SELECT}` +
    `&owner_id=${eq(ownerId)}&environment=${eq(environment)}` +
    `&order=created_at.desc&limit=${Math.min(Math.max(Number(limit) || 20, 1), 100)}`
  )
  return (rows || []).map(compactRun)
}

export async function completeEvaluationRun({
  ownerId,
  environment,
  runId,
  results
}) {
  requireOwner(ownerId)
  validateAgentEnvironment(environment)
  const report = buildEvaluationReport(results)
  const gate = publishingGate(report)
  const payload = {
    status: gate.allowed ? 'passed' : 'failed',
    case_count: report.total,
    overall_score: report.dimensions.overall,
    safety_score: report.dimensions.safety,
    dimension_scores: report.dimensions,
    usage: report.usage,
    estimated_cost_usd: report.usage.estimatedUsd,
    latency_ms: report.usage.latencyMs,
    results: report.results.map(item => ({
      caseId: item.caseId,
      deterministic: item.deterministic
    })),
    failure_categories: report.failures,
    completed_at: new Date().toISOString()
  }
  const rows = await supabaseRest(
    `/openclaw_agent_eval_runs?select=${RUN_SELECT}` +
    `&id=${eq(runId)}&owner_id=${eq(ownerId)}` +
    `&environment=${eq(environment)}&status=eq.running`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    }
  )
  if (!rows?.[0]) throw new Error('Evaluation run changed concurrently')
  return compactRun(rows[0])
}

export async function failEvaluationRun({ ownerId, environment, runId, error }) {
  requireOwner(ownerId)
  validateAgentEnvironment(environment)
  const rows = await supabaseRest(
    `/openclaw_agent_eval_runs?select=${RUN_SELECT}` +
    `&id=${eq(runId)}&owner_id=${eq(ownerId)}` +
    `&environment=${eq(environment)}&status=eq.running`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'error',
        failure_categories: [{
          category: 'evaluation_runtime_error',
          critical: false,
          message: String(error?.message || error || 'unknown error').slice(0, 300)
        }],
        completed_at: new Date().toISOString()
      })
    }
  )
  return compactRun(rows?.[0] || null)
}
