import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { FIXED_EVALUATION_CASES } from '@/lib/openclaw/agent-v2/evaluation'
import { agentStudioAuthorized } from '@/lib/server/openclawAgentConfigs'
import { getEvaluationRun } from '@/lib/server/openclawAgentEvaluations'

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function intentMismatches(expected = {}, actual = {}) {
  return ['action', 'domain', 'objectType', 'scope']
    .filter(key => !equal(expected[key], actual[key]))
}

function failureLabels(result = {}, expected = {}) {
  const labels = []
  const actual = result.actual || {}
  if (intentMismatches(expected, actual).length) labels.push('intent_mismatch')
  if (result.modelError) labels.push('model_error')
  if (!result.modelError && !equal(Boolean(expected.executionAllowed), Boolean(actual.executionAllowed))) {
    labels.push('unsafe_write')
  }
  if (result.budgetExceeded) labels.push('budget_exceeded')
  return labels
}

function compactResult(result = {}, expected = {}) {
  const actual = result.actual || {}
  const mismatchedFields = intentMismatches(expected, actual)
  return {
    caseId: result.caseId,
    partition: expected.partition || null,
    tags: expected.tags || [],
    failures: failureLabels(result, expected),
    mismatchedFields,
    expected: {
      action: expected.action,
      domain: expected.domain,
      objectType: expected.objectType,
      scope: expected.scope,
      executionAllowed: Boolean(expected.executionAllowed),
      criticalSafety: Boolean(expected.criticalSafety)
    },
    actual: {
      action: actual.action ?? null,
      domain: actual.domain ?? null,
      objectType: actual.objectType ?? null,
      scope: actual.scope ?? null,
      executionAllowed: Boolean(actual.executionAllowed),
      slots: actual.slots || null,
      contextReferences: actual.contextReferences || [],
      uncertainties: actual.uncertainties || []
    },
    modelError: result.modelError || null,
    budgetExceeded: Boolean(result.budgetExceeded),
    pricingUnknown: Boolean(result.pricingUnknown),
    usage: {
      inputTokens: Number(result.inputTokens || 0),
      outputTokens: Number(result.outputTokens || 0),
      estimatedUsd: Number(result.estimatedUsd || 0),
      latencyMs: Number(result.latencyMs || 0)
    }
  }
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, {
    permission: 'ai',
    ignoreImpersonation: true
  })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  if (!agentStudioAuthorized(auth)) {
    return res.status(403).json({ ok: false, error: 'Owner access required' })
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const environment = String(req.query?.environment || 'preview')
  const runId = String(req.query?.runId || '')
  if (!runId) {
    return res.status(400).json({ ok: false, error: 'runId is required' })
  }

  try {
    const run = await getEvaluationRun({
      ownerId: auth.actorProfile.id,
      environment,
      runId
    })
    if (!run) return res.status(404).json({ ok: false, error: 'Evaluation run not found' })

    const caseById = new Map(FIXED_EVALUATION_CASES.map(item => [item.id, item]))
    const results = Array.isArray(run.results) ? run.results : []
    const failedResults = results
      .map(result => {
        const fixture = caseById.get(result.caseId) || {}
        return compactResult(result, {
          ...(fixture.expected || {}),
          partition: fixture.partition,
          tags: fixture.tags
        })
      })
      .filter(result => result.failures.length)

    const { results: _results, ...summary } = run
    return res.status(200).json({
      ok: true,
      environment,
      run: summary,
      totalResults: results.length,
      failedCount: failedResults.length,
      failedResults
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Evaluation detail failed'
    })
  }
}
