#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import adapter from './validated-course-adapter.mjs'
import {
  buildRegressionReport,
  flattenRegressionCandidates,
  selectRegressionCandidate,
  verifyRegressionCleanup,
  writeRegressionReport
} from './e2e-core.mjs'
import {
  runE2ePreflight
} from './e2e-preflight.mjs'
import {
  runClaimedCourseTask
} from './pipeline-runner-core.mjs'
import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'
import {
  createValidatedAcquisitionRuntime
} from './runtime/acquisition-runtime.mjs'

function parseArgs(argv) {
  const result = {}
  for (
    let index = 2;
    index < argv.length;
    index += 1
  ) {
    const value = argv[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      result[key] = true
    } else {
      result[key] = next
      index += 1
    }
  }
  return result
}

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
}

async function main() {
  const args = parseArgs(process.argv)
  const startedAt =
    new Date().toISOString()
  const workerId = String(
    args['worker-id'] ||
    process.env.COURSE_WORKER_ID ||
    `e2e-${os.hostname()}-${process.pid}`
  ).replace(
    /[^A-Za-z0-9._:-]/g,
    '_'
  )
  const leaseSeconds = Math.max(
    900,
    Number(
      args['lease-seconds'] || 1800
    )
  )
  const stageTimeline = []
  let candidate = null
  let finalTask = null
  let cleanup = null
  let preflight = null
  let caught = null

  const reportBase = path.resolve(
    process.env.COURSE_E2E_REPORT_DIR ||
    path.join(
      os.homedir(),
      '.law-tech-course-worker',
      'reports'
    )
  )
  let reportDir = path.join(
    reportBase,
    `pending-${timestamp()}`
  )

  try {
    preflight = await runE2ePreflight({
      quiet: true
    })
    if (!preflight.ok) {
      console.log(
        JSON.stringify(preflight, null, 2)
      )
      throw new Error(
        'E2E preflight failed'
      )
    }

    const discoveryRuntime =
      createValidatedAcquisitionRuntime()
    try {
      const discovery =
        await discoveryRuntime.discover({
          courseName:
            args.course || ''
        })
      candidate =
        selectRegressionCandidate(
          flattenRegressionCandidates(
            discovery
          ),
          {
            replayKey:
              args['replay-key'] || '',
            courseName:
              args.course || '',
            title:
              args.title || ''
          }
        )
    } finally {
      await discoveryRuntime.close()
    }

    reportDir = path.join(
      reportBase,
      `${candidate.replayKey}-${timestamp()}`
    )
    console.log(
      `Selected: ${candidate.courseName} · ${candidate.title}`
    )
    console.log(
      `Replay: ${candidate.replayKey}`
    )

    const client =
      createCoursePipelineWorkerClient()
    await client.discover([
      candidate
    ])

    if (args.retry) {
      await client.retry(
        candidate.replayKey,
        'real-e2e-retry'
      )
    }

    const claimed =
      await client.claimSpecific(
        candidate.replayKey,
        {
          workerId,
          leaseSeconds
        }
      )
    if (!claimed.task) {
      throw new Error(
        'The selected replay could not be claimed'
      )
    }

    const observedClient = {
      ...client,
      async report(replayKey, patch) {
        const result =
          await client.report(
            replayKey,
            patch
          )
        stageTimeline.push({
          at: new Date().toISOString(),
          stage: patch.stage
        })
        return result
      }
    }

    const result =
      await runClaimedCourseTask({
        client: observedClient,
        adapter,
        task: claimed.task,
        workerId,
        leaseSeconds,
        heartbeatEveryMs: 60_000,
        log: message =>
          console.log(`· ${message}`)
      })
    finalTask = result.task

    const scratchRoot = path.resolve(
      process.env.COURSE_WORKER_SCRATCH_DIR ||
      path.join(
        os.homedir(),
        '.law-tech-course-worker'
      )
    )
    cleanup = verifyRegressionCleanup(
      scratchRoot,
      finalTask
    )

    if (
      finalTask.stage !==
      'awaiting_llm_window'
    ) {
      throw new Error(
        `Unexpected final stage: ${finalTask.stage}`
      )
    }
    if (
      !cleanup.mediaDeleted ||
      !cleanup.fragmentsDeleted
    ) {
      throw new Error(
        'Media cleanup verification failed'
      )
    }
  } catch (error) {
    caught = error
    throw error
  } finally {
    const report =
      buildRegressionReport({
        startedAt,
        finishedAt:
          new Date().toISOString(),
        workerId,
        candidate,
        stageTimeline,
        finalTask,
        cleanup,
        preflight,
        error: caught
          ? {
              name:
                caught.name || 'Error',
              code:
                caught.code || '',
              message:
                caught.message ||
                String(caught)
            }
          : null
      })
    const paths =
      writeRegressionReport(
        reportDir,
        report
      )
    console.log(
      `Report: ${paths.markdownPath}`
    )
  }
}

main().catch(error => {
  console.error(
    `✗ ${
      error instanceof Error
        ? error.message
        : String(error)
    }`
  )
  process.exitCode = 1
})
