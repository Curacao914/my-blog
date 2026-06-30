#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import './worker-env.mjs'
import adapter from './validated-course-adapter.mjs'
import {
  acquireRunLock,
  releaseRunLock
} from './e2e-supervisor-core.mjs'
import {
  createValidatedAcquisitionRuntime
} from './runtime/acquisition-runtime.mjs'
import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'
import {
  runClaimedCourseTask
} from './pipeline-runner-core.mjs'
import {
  buildCycleSummary,
  collectAllowedReplays,
  cycleExitCode,
  markdownCycleSummary,
  parseAllowlist,
  safeRunDirectoryName,
  selectActionableTasks
} from './production-cycle-core.mjs'
import {
  collectProductionHealth
} from './production-health-core.mjs'
import {
  sendCycleNotification
} from './production-notifier.mjs'

function parseArgs(argv) {
  const result = {}
  for (
    let index = 2;
    index < argv.length;
    index += 1
  ) {
    const value = argv[index]
    if (!value.startsWith('--')) {
      continue
    }
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

function positiveInteger(
  value,
  fallback,
  maximum
) {
  const parsed = Number(value)
  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback
  }
  return Math.min(
    maximum,
    parsed
  )
}

function cleanWorkerId(value) {
  return String(value || '')
    .replace(
      /[^A-Za-z0-9._:-]/g,
      '_'
    )
    .slice(0, 120)
}

function writeSummary(
  runDir,
  summary
) {
  fs.mkdirSync(runDir, {
    recursive: true
  })
  fs.writeFileSync(
    path.join(
      runDir,
      'summary.json'
    ),
    JSON.stringify(
      summary,
      null,
      2
    ) + '\n'
  )
  fs.writeFileSync(
    path.join(
      runDir,
      'summary.md'
    ),
    markdownCycleSummary(
      summary
    )
  )
}

async function main() {
  const args = parseArgs(
    process.argv
  )
  const allowAll =
    Boolean(args.all)
  const allowlist =
    parseAllowlist(
      args.allow ||
      process.env
        .COURSE_PIPELINE_ALLOWLIST
    )
  const maxTasks =
    positiveInteger(
      args['max-tasks'] ||
      process.env
        .COURSE_PIPELINE_MAX_TASKS,
      4,
      20
    )
  const sinceDays =
    positiveInteger(
      args['since-days'] ||
      process.env
        .COURSE_PIPELINE_SINCE_DAYS,
      35,
      365
    )
  const leaseSeconds =
    positiveInteger(
      args['lease-seconds'] ||
      process.env
        .COURSE_PIPELINE_LEASE_SECONDS,
      1800,
      3600
    )
  const workerId =
    cleanWorkerId(
      args['worker-id'] ||
      process.env.COURSE_WORKER_ID ||
      `course-cycle:${os.hostname()}`
    )

  const scratchRoot = path.resolve(
    process.env
      .COURSE_WORKER_SCRATCH_DIR ||
    path.join(
      os.homedir(),
      '.law-tech-course-worker'
    )
  )
  const startedAt =
    new Date().toISOString()
  const runDir = path.join(
    scratchRoot,
    'runs',
    safeRunDirectoryName(
      startedAt
    )
  )
  const lockDir = path.join(
    scratchRoot,
    'locks',
    'production-cycle.lock'
  )
  fs.mkdirSync(
    path.dirname(lockDir),
    {
      recursive: true
    }
  )
  acquireRunLock(lockDir)

  let discovery = {
    loginMode: '',
    courses: []
  }
  let selectedReplays = []
  let discoverResult = {
    addedCount: 0
  }
  const results = []
  let cycleError = null

  try {
    const health =
      await collectProductionHealth({
        allowAll,
        allowlist
      })
    fs.mkdirSync(runDir, {
      recursive: true
    })
    fs.writeFileSync(
      path.join(
        runDir,
        'health.json'
      ),
      JSON.stringify(
        health,
        null,
        2
      ) + '\n'
    )
    if (!health.ok) {
      throw new Error(
        'Production health check failed'
      )
    }

    const acquisition =
      createValidatedAcquisitionRuntime({
        scratchRoot
      })
    try {
      discovery =
        await acquisition.discover()
    } finally {
      await acquisition.close()
    }

    selectedReplays =
      collectAllowedReplays(
        discovery,
        {
          allowlist,
          allowAll,
          sinceDays
        }
      )
    const client =
      createCoursePipelineWorkerClient()

    discoverResult =
      await client.discover(
        selectedReplays
      )

    const listed =
      await client.list({
        limit: 100
      })
    const actionable =
      selectActionableTasks(
        listed.tasks || [],
        {
          allowlist,
          allowAll,
          maximum: maxTasks
        }
      )

    for (const candidate of actionable) {
      const claimed =
        await client.claimSpecific(
          candidate.replay_key,
          {
            workerId,
            leaseSeconds
          }
        )
      if (!claimed.task) {
        continue
      }

      const result =
        await runClaimedCourseTask({
          client,
          adapter,
          task:
            claimed.task,
          workerId,
          leaseSeconds,
          heartbeatEveryMs:
            60_000,
          log: message =>
            console.log(
              `· ${message}`
            )
        })
      results.push(result)
    }
  } catch (error) {
    cycleError = error
  } finally {
    const summary =
      buildCycleSummary({
        startedAt,
        finishedAt:
          new Date().toISOString(),
        workerId,
        loginMode:
          discovery.loginMode,
        allowlist:
          allowAll
            ? ['*']
            : allowlist,
        scannedCourses:
          discovery.courses.length,
        selectedReplays:
          selectedReplays.length,
        newlyAdded:
          discoverResult.addedCount ||
          0,
        results
      })

    if (cycleError) {
      summary.status = 'error'
      summary.error = {
        name:
          cycleError.name ||
          'Error',
        code:
          cycleError.code || '',
        message:
          String(
            cycleError.message ||
            cycleError
          ).slice(0, 1000)
      }
    }

    writeSummary(
      runDir,
      summary
    )
    const notification =
      await sendCycleNotification(
        summary
      )
    fs.writeFileSync(
      path.join(
        runDir,
        'notification.json'
      ),
      JSON.stringify(
        notification,
        null,
        2
      ) + '\n'
    )
    releaseRunLock(lockDir)

    console.log(
      `Cycle summary: ${path.join(runDir, 'summary.md')}`
    )

    if (cycleError) {
      throw cycleError
    }

    const exitCode =
      cycleExitCode(summary)
    if (exitCode) {
      process.exitCode =
        exitCode
    }
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
  process.exitCode =
    process.exitCode || 1
})
