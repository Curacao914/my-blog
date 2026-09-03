import { defineHook, getWorkflowMetadata, sleep } from 'workflow'

import { courseBatchDirective, runCourseWorkerBatch } from '@/lib/course/runBatch'
import { courseRuntimeSummary, patchCourseOrchestrator } from '@/lib/courseRepository'

export const courseControlHook = defineHook()

async function saveOrchestratorState(jobId, patch) {
  'use step'
  const now = new Date().toISOString()
  const expanded = { ...patch }
  if (expanded.markStarted) { expanded.startedAt = now; delete expanded.markStarted }
  if (expanded.markCompleted) { expanded.completedAt = now; delete expanded.markCompleted }
  return patchCourseOrchestrator(jobId, expanded)
}

async function executeCourseBatch(jobId) {
  'use step'
  const result = await runCourseWorkerBatch(jobId, { leaseSeconds: 240 })
  const directive = courseBatchDirective(result)
  return {
    ...directive,
    summary: courseRuntimeSummary(result.workflow),
    completedSteps: result.completedSteps || [],
    partialFailureCount: result.failures?.length || 0
  }
}

export async function courseProcessingWorkflow(jobId) {
  'use workflow'

  const { workflowRunId } = getWorkflowMetadata()
  await saveOrchestratorState(jobId, {
    runId: workflowRunId, state: 'running', waitingReason: '', hookToken: '', markStarted: true
  })

  let busyCount = 0
  while (true) {
    const result = await executeCourseBatch(jobId)
    if (result.nextAction === 'run') {
      busyCount = 0
      continue
    }
    if (result.nextAction === 'busy') {
      const delays = [5000, 15000, 30000, 60000]
      const delay = delays[Math.min(busyCount, delays.length - 1)]
      busyCount += 1
      await sleep(Math.max(delay, Number(result.retryAfterMs || 0)))
      continue
    }
    if (result.nextAction === 'done') {
      await saveOrchestratorState(jobId, {
        runId: workflowRunId, state: 'completed', waitingReason: result.reason || '', hookToken: '', markCompleted: true
      })
      return { ok: true, status: result.summary?.status || 'completed' }
    }

    const token = `course:${jobId}`
    const hook = courseControlHook.create({ token })
    const conflict = await hook.getConflict()
    if (conflict) {
      await saveOrchestratorState(jobId, {
        runId: workflowRunId, state: 'superseded', waitingReason: 'hook-conflict', hookToken: ''
      })
      return { ok: false, status: 'superseded', runId: conflict.runId }
    }
    await saveOrchestratorState(jobId, {
      runId: workflowRunId, state: 'waiting', waitingReason: result.reason || 'waiting-for-user', hookToken: token
    })
    await hook
    await saveOrchestratorState(jobId, {
      runId: workflowRunId, state: 'running', waitingReason: '', hookToken: ''
    })
  }
}
