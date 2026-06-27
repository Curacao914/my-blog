import { getRun, start } from 'workflow/api'

import { courseProcessingWorkflow, courseControlHook } from '@/workflows/courseProcessing'
import { getCourseOrchestrator, getCourseRuntime, patchCourseOrchestrator } from '@/lib/courseRepository'

const AUTO_STATUSES = new Set([
  'preflight_approved', 'outline_pending', 'outline_generating', 'outline_approved', 'node_planning',
  'node_pending', 'node_generating', 'node_review', 'node_revision_required', 'assembly_pending',
  'assembling', 'final_review'
])

async function existingRun(orchestrator) {
  if (!orchestrator?.runId) return null
  try {
    const run = getRun(orchestrator.runId)
    if (!(await run.exists)) return null
    const status = await run.status
    return ['pending', 'running', 'workflow_suspended'].includes(status) ? { run, status } : null
  } catch {
    return null
  }
}

export async function ensureCourseOrchestrator(jobId) {
  const orchestrator = await getCourseOrchestrator(jobId)
  const existing = await existingRun(orchestrator)
  if (existing) return { runId: orchestrator.runId, status: existing.status, existing: true }

  const run = await start(courseProcessingWorkflow, [jobId])
  await patchCourseOrchestrator(jobId, {
    runId: run.runId, state: 'starting', waitingReason: '', hookToken: '', startedAt: new Date().toISOString()
  })
  return { runId: run.runId, status: 'pending', existing: false }
}

export async function signalCourseOrchestrator(jobId, payload = {}) {
  const orchestrator = await getCourseOrchestrator(jobId)
  let resumed = false
  if (orchestrator?.hookToken) {
    try {
      const result = await courseControlHook.resume(orchestrator.hookToken, {
        action: String(payload.action || 'state-changed'), at: new Date().toISOString()
      })
      resumed = Boolean(result)
    } catch {
      resumed = false
    }
  }

  const { runtime } = await getCourseRuntime(jobId)
  const status = runtime?.status || 'preflight_required'
  if (AUTO_STATUSES.has(status) && !runtime?.paused && !runtime?.cancelled) {
    const run = await ensureCourseOrchestrator(jobId)
    return { resumed, ...run }
  }
  return { resumed, runId: orchestrator?.runId || '', status: orchestrator?.state || 'waiting', existing: true }
}
