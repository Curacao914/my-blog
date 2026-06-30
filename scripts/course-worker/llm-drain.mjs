#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import './worker-env.mjs'
import {
  acquireRunLock,
  releaseRunLock
} from './e2e-supervisor-core.mjs'
import {
  buildLlmDrainSummary,
  drainCourseLlmTasks
} from './llm-drain-core.mjs'
import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'
import {
  parseAllowlist,
  safeRunDirectoryName
} from './production-cycle-core.mjs'
import {
  sendCycleNotification
} from './production-notifier.mjs'

function parseArgs(argv) {
  const result = {}
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) result[key] = true
    else {
      result[key] = next
      index += 1
    }
  }
  return result
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(maximum, parsed)
}

function writeSummary(runDir, summary) {
  fs.mkdirSync(runDir, { recursive: true })
  fs.writeFileSync(
    path.join(runDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`
  )
  const lines = [
    '# Course LLM Drain',
    '',
    `- Status: ${summary.status}`,
    `- Started: ${summary.startedAt}`,
    `- Finished: ${summary.finishedAt}`,
    `- Selected: ${summary.discovery.selectedReplays}`,
    `- Batches: ${summary.counts.batches}`,
    `- Completed: ${summary.counts.completed}`,
    `- Awaiting window: ${summary.counts.awaitingWindow}`,
    `- Writing: ${summary.counts.writing}`,
    `- Needs attention: ${summary.counts.needsAttention}`,
    '',
    '## Tasks',
    ''
  ]
  if (!summary.tasks.length) lines.push('- Queue idle.')
  for (const task of summary.tasks) {
    lines.push(
      `- ${task.courseName} · ${task.title} · ${task.stage}` +
      (task.reason ? ` · ${task.reason}` : '') +
      (task.errorMessage ? ` · ${task.errorMessage}` : '')
    )
  }
  fs.writeFileSync(
    path.join(runDir, 'summary.md'),
    `${lines.join('\n')}\n`
  )
}

async function main() {
  const args = parseArgs(process.argv)
  const allowAll = Boolean(args.all)
  const allowlist = parseAllowlist(
    args.allow || process.env.COURSE_PIPELINE_ALLOWLIST
  )
  if (!allowAll && !allowlist.length) {
    throw new Error(
      'COURSE_PIPELINE_ALLOWLIST is required unless --all is used'
    )
  }

  const workerId = String(
    args['worker-id'] ||
    process.env.COURSE_WORKER_ID ||
    `course-llm:${os.hostname()}`
  ).replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 120)

  const scratchRoot = path.resolve(
    process.env.COURSE_WORKER_SCRATCH_DIR ||
    path.join(os.homedir(), '.law-tech-course-worker')
  )
  const startedAt = new Date().toISOString()
  const runDir = path.join(
    scratchRoot,
    'runs',
    safeRunDirectoryName(startedAt).replace('cycle-', 'llm-')
  )
  const lockDir = path.join(
    scratchRoot,
    'locks',
    'llm-drain.lock'
  )
  fs.mkdirSync(path.dirname(lockDir), { recursive: true })
  acquireRunLock(lockDir)

  let summary
  try {
    const client = createCoursePipelineWorkerClient({
      timeoutMs: positiveInteger(
        process.env.COURSE_CONTROL_PLANE_TIMEOUT_MS,
        30_000,
        300_000
      )
    })
    const result = await drainCourseLlmTasks({
      client,
      allowlist,
      allowAll,
      maxTasks: args['max-tasks'] ||
        process.env.COURSE_LLM_MAX_TASKS_PER_CYCLE,
      maxBatchesPerTask: args['max-batches-per-task'] ||
        process.env.COURSE_LLM_MAX_BATCHES_PER_TASK,
      maxBatches: args['max-batches'] ||
        process.env.COURSE_LLM_MAX_BATCHES_PER_CYCLE,
      costMode: args['cost-mode'] ||
        process.env.COURSE_LLM_COST_MODE ||
        '',
      log: message => console.log(`· ${message}`)
    })
    summary = buildLlmDrainSummary({
      ...result,
      startedAt,
      finishedAt: new Date().toISOString(),
      workerId
    })
  } catch (error) {
    summary = buildLlmDrainSummary({
      startedAt,
      finishedAt: new Date().toISOString(),
      workerId,
      selected: 0,
      batches: 0,
      results: []
    })
    summary.status = 'error'
    summary.error = {
      name: error?.name || 'Error',
      code: String(error?.code || ''),
      message: error instanceof Error ? error.message : String(error)
    }
  } finally {
    if (summary) {
      writeSummary(runDir, summary)
      const notification = await sendCycleNotification(summary)
      fs.writeFileSync(
        path.join(runDir, 'notification.json'),
        `${JSON.stringify(notification, null, 2)}\n`
      )
      console.log(`LLM summary: ${path.join(runDir, 'summary.md')}`)
    }
    releaseRunLock(lockDir)
  }

  if (summary.status === 'attention') process.exitCode = 2
  else if (summary.status === 'error') process.exitCode = 1
}

main().catch(error => {
  console.error(
    `✗ ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = process.exitCode || 1
})
