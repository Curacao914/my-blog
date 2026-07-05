import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { FIXED_EVALUATION_CASES } from '@/lib/openclaw/agent-v2/evaluation'
import { runFixedSetEvaluation } from '@/lib/openclaw/agent-v2/evaluation/modelEvaluator'
import {
  agentStudioAuthorized,
  findAgentConfig
} from '@/lib/server/openclawAgentConfigs'
import {
  completeEvaluationRun,
  createEvaluationRun,
  failEvaluationRun,
  getEvaluationRun,
  saveEvaluationRunProgress,
  syncFixedEvaluationCases
} from '@/lib/server/openclawAgentEvaluations'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

export const config = { api: { responseLimit: false } }
const BATCH_SIZE = 24

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, {
    permission: 'ai',
    ignoreImpersonation: true
  })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })
  if (!agentStudioAuthorized(auth)) {
    return res.status(403).json({ ok: false, error: 'Owner access required' })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const { environment, configId, runId } = req.body || {}
  let run = null
  try {
    const selected = await findAgentConfig({
      ownerId: auth.actorProfile.id,
      environment,
      configId
    })
    if (!selected || selected.status !== 'draft') {
      return res.status(400).json({ ok: false, error: 'Evaluation requires an owned draft' })
    }
    const resolved = await resolveUserAiConfig(auth.actorProfile)
    const model = selected.profile?.models?.interpreter
    if (!resolved.apiKey || !resolved.baseUrl || !model) {
      return res.status(400).json({ ok: false, error: 'Evaluation model is not configured' })
    }
    if (runId) {
      run = await getEvaluationRun({
        ownerId: auth.actorProfile.id,
        environment,
        runId
      })
      if (
        !run || run.status !== 'running' ||
        run.config_id !== configId || run.model !== model
      ) {
        return res.status(409).json({ ok: false, error: 'Evaluation run cannot be resumed' })
      }
    } else {
      await syncFixedEvaluationCases({ ownerId: auth.actorProfile.id, environment })
      run = await createEvaluationRun({
        ownerId: auth.actorProfile.id,
        environment,
        configId,
        model
      })
    }
    const expectedById = new Map(
      FIXED_EVALUATION_CASES.map(item => [item.id, item.expected])
    )
    const existingResults = (Array.isArray(run.results) ? run.results : []).map(item => ({
      ...item,
      expected: expectedById.get(item.caseId)
    }))
    const completedIds = new Set(existingResults.map(item => item.caseId))
    const pendingCases = FIXED_EVALUATION_CASES.filter(item => !completedIds.has(item.id))
    const batch = pendingCases.slice(0, BATCH_SIZE)
    const batchResults = batch.length ? await runFixedSetEvaluation({
      cases: batch,
      profile: selected.profile,
      modelConfig: {
        apiKey: resolved.apiKey,
        baseUrl: resolved.baseUrl,
        model,
        inputUsdPerMillion: resolved.pricing?.inputPricePerMillion || 0,
        outputUsdPerMillion: resolved.pricing?.outputPricePerMillion || 0
      },
      concurrency: 6
    }) : []
    const results = [...existingResults, ...batchResults]
    if (pendingCases.length > batch.length) {
      const progress = await saveEvaluationRunProgress({
        ownerId: auth.actorProfile.id,
        environment,
        runId: run.id,
        expectedCaseCount: existingResults.length,
        results
      })
      return res.status(202).json({
        ok: true,
        done: false,
        run: progress,
        completedCases: results.length,
        totalCases: FIXED_EVALUATION_CASES.length
      })
    }
    const completed = await completeEvaluationRun({
      ownerId: auth.actorProfile.id,
      environment,
      runId: run.id,
      results
    })
    return res.status(200).json({
      ok: true,
      done: true,
      run: completed,
      completedCases: results.length,
      totalCases: FIXED_EVALUATION_CASES.length
    })
  } catch (error) {
    if (run?.id) {
      await failEvaluationRun({
        ownerId: auth.actorProfile.id,
        environment,
        runId: run.id,
        error
      }).catch(() => {})
    }
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Agent evaluation failed'
    })
  }
}
