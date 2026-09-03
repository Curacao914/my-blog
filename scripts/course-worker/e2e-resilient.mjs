#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {
  spawn
} from 'node:child_process'
import {
  fileURLToPath
} from 'node:url'

import './worker-env.mjs'
import {
  acquireRunLock,
  classifyFreshReport,
  clampInteger,
  concurrencyForAttempt,
  latestFreshReport,
  progressSignature,
  readProgressSnapshot,
  releaseRunLock,
  shouldDeclareStall,
  stableWorkerId
} from './e2e-supervisor-core.mjs'

const MODULE_DIR = path.dirname(
  fileURLToPath(import.meta.url)
)
const REPO_ROOT = path.resolve(
  MODULE_DIR,
  '../..'
)

function parseArgs(argv) {
  const result = {
    retry: true
  }
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

function required(value, name) {
  const result = String(value || '').trim()
  if (!result) {
    throw new Error(`${name} is required`)
  }
  return result
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  )
}

function humanBytes(value) {
  let size = Number(value || 0)
  let unit = 'B'
  for (const candidate of [
    'B',
    'KB',
    'MB',
    'GB'
  ]) {
    unit = candidate
    if (size < 1024 || unit === 'GB') break
    size /= 1024
  }
  return `${size.toFixed(1)}${unit}`
}

function nodeArgs() {
  return process.env.NODE_USE_ENV_PROXY === '1'
    ? ['--use-env-proxy']
    : []
}

async function terminateProcessGroup(child) {
  if (!child || child.exitCode != null) return

  const send = signal => {
    try {
      if (
        process.platform !== 'win32' &&
        child.pid
      ) {
        process.kill(-child.pid, signal)
      } else {
        child.kill(signal)
      }
    } catch {
      // Process may already be gone.
    }
  }

  send('SIGTERM')
  const deadline = Date.now() + 15_000
  while (
    child.exitCode == null &&
    Date.now() < deadline
  ) {
    await sleep(250)
  }
  if (child.exitCode == null) {
    send('SIGKILL')
  }
}

function cleanPartFiles(replayRoot) {
  const fragments = path.join(
    replayRoot,
    'fragments'
  )
  if (!fs.existsSync(fragments)) return 0
  let removed = 0

  for (const track of fs.readdirSync(
    fragments,
    { withFileTypes: true }
  )) {
    if (!track.isDirectory()) continue
    const trackPath = path.join(
      fragments,
      track.name
    )
    for (const file of fs.readdirSync(
      trackPath,
      { withFileTypes: true }
    )) {
      if (
        file.isFile() &&
        file.name.endsWith('.part')
      ) {
        fs.rmSync(
          path.join(trackPath, file.name),
          { force: true }
        )
        removed += 1
      }
    }
  }
  return removed
}

function writeSupervisorSummary(
  reportDir,
  value
) {
  fs.mkdirSync(reportDir, {
    recursive: true
  })
  fs.writeFileSync(
    path.join(
      reportDir,
      'supervisor-summary.json'
    ),
    JSON.stringify(value, null, 2) + '\n'
  )
}

async function runAttempt(options) {
  const {
    attempt,
    args,
    workerId,
    replayRoot,
    reportRoot,
    logDir,
    startupGraceMs,
    stallMs,
    pollMs
  } = options

  const startedAtMs = Date.now()
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
  const logPath = path.join(
    logDir,
    `course-e2e-final-attempt-${attempt}-${stamp}.log`
  )
  const logStream = fs.createWriteStream(
    logPath,
    { flags: 'a' }
  )

  const env = {
    ...process.env,
    COURSE_DOWNLOAD_CONCURRENCY: String(
      concurrencyForAttempt(attempt)
    )
  }

  const childArgs = [
    ...nodeArgs(),
    path.join(
      MODULE_DIR,
      'e2e-run-one.mjs'
    ),
    '--course',
    args.course,
    '--title',
    args.title,
    '--replay-key',
    args['replay-key'],
    '--worker-id',
    workerId,
    '--lease-seconds',
    String(args['lease-seconds'])
  ]
  if (args.retry !== false) {
    childArgs.push('--retry')
  }

  const child = spawn(
    process.execPath,
    childArgs,
    {
      cwd: REPO_ROOT,
      env,
      detached:
        process.platform !== 'win32',
      stdio: [
        'ignore',
        'pipe',
        'pipe'
      ]
    }
  )

  options.onChild?.(child)

  child.stdout.on('data', chunk => {
    process.stdout.write(chunk)
    logStream.write(chunk)
  })
  child.stderr.on('data', chunk => {
    process.stderr.write(chunk)
    logStream.write(chunk)
  })

  let snapshot =
    readProgressSnapshot(replayRoot)
  let signature =
    progressSignature(snapshot)
  let lastProgressAt = startedAtMs
  let stalled = false

  const monitor = setInterval(() => {
    const current =
      readProgressSnapshot(replayRoot)
    const currentSignature =
      progressSignature(current)
    const now = Date.now()

    if (currentSignature !== signature) {
      signature = currentSignature
      snapshot = current
      lastProgressAt = now
      console.log(
        `✓ progress attempt=${attempt} ` +
        `resources=${current.completedResources}` +
        (
          current.totalResources
            ? `/${current.totalResources}`
            : ''
        ) +
        ` bytes=${humanBytes(current.bytes)}`
      )
      return
    }

    const elapsed = now - startedAtMs
    const idle = now - lastProgressAt
    console.log(
      `· monitor attempt=${attempt} ` +
      `elapsed=${Math.round(elapsed / 1000)}s ` +
      `idle=${Math.round(idle / 1000)}s ` +
      `resources=${current.completedResources}` +
      (
        current.totalResources
          ? `/${current.totalResources}`
          : ''
      ) +
      ` bytes=${humanBytes(current.bytes)}`
    )

    if (
      shouldDeclareStall({
        now,
        startedAt: startedAtMs,
        lastProgressAt,
        startupGraceMs,
        stallMs
      })
    ) {
      stalled = true
      clearInterval(monitor)
      console.log(
        `⚠ attempt ${attempt} stalled; terminating child process group`
      )
      terminateProcessGroup(child)
        .catch(() => {})
    }
  }, pollMs)
  monitor.unref?.()

  const exit = await new Promise(resolve => {
    child.once('error', error => {
      resolve({
        code: 1,
        signal: '',
        error
      })
    })
    child.once('exit', (code, signal) => {
      resolve({
        code:
          Number.isInteger(code)
            ? code
            : 1,
        signal: signal || '',
        error: null
      })
    })
  })

  clearInterval(monitor)
  options.onChild?.(null)
  logStream.end()
  await sleep(1_000)

  const fresh = latestFreshReport(
    reportRoot,
    args['replay-key'],
    startedAtMs
  )
  const classification = fresh
    ? classifyFreshReport(fresh.report)
    : {
        action: stalled ? 'retry' : 'retry',
        stage: '',
        message:
          stalled
            ? 'download stalled without a fresh report'
            : 'worker exited without a fresh report'
      }

  return {
    attempt,
    startedAt:
      new Date(startedAtMs).toISOString(),
    finishedAt:
      new Date().toISOString(),
    workerId,
    concurrency:
      concurrencyForAttempt(attempt),
    stalled,
    exit,
    logPath,
    reportPath:
      fresh?.reportPath || '',
    classification,
    snapshot:
      readProgressSnapshot(replayRoot)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  args.course = required(
    args.course,
    '--course'
  )
  args.title = required(
    args.title,
    '--title'
  )
  args['replay-key'] = required(
    args['replay-key'],
    '--replay-key'
  )
  args['lease-seconds'] =
    clampInteger(
      args['lease-seconds'],
      1800,
      900,
      3600
    )

  const maxAttempts =
    clampInteger(
      args.attempts ||
      process.env.COURSE_E2E_MAX_ATTEMPTS,
      5,
      1,
      10
    )
  const startupGraceMs =
    clampInteger(
      args['startup-grace-seconds'] ||
      process.env
        .COURSE_E2E_STARTUP_GRACE_SECONDS,
      240,
      30,
      1800
    ) * 1000
  const stallMs =
    clampInteger(
      args['stall-seconds'] ||
      process.env
        .COURSE_E2E_STALL_SECONDS,
      480,
      60,
      3600
    ) * 1000
  const pollMs =
    clampInteger(
      args['poll-seconds'] ||
      process.env
        .COURSE_E2E_POLL_SECONDS,
      20,
      5,
      120
    ) * 1000
  const retryDelayMs =
    clampInteger(
      args['retry-delay-seconds'] ||
      process.env
        .COURSE_E2E_RETRY_DELAY_SECONDS,
      90,
      0,
      1800
    ) * 1000

  const scratchRoot = path.resolve(
    process.env.COURSE_WORKER_SCRATCH_DIR ||
    path.join(
      os.homedir(),
      '.law-tech-course-worker'
    )
  )
  const replayRoot = path.join(
    scratchRoot,
    'replays',
    args['replay-key']
  )
  const reportRoot = path.join(
    scratchRoot,
    'reports'
  )
  const logDir = path.join(
    os.homedir(),
    '.law-tech-worker-logs'
  )
  const lockDir = path.join(
    scratchRoot,
    'locks',
    `${args['replay-key']}.final.lock`
  )
  const workerId = String(
    args['worker-id'] ||
    process.env.COURSE_WORKER_ID ||
    stableWorkerId(
      args['replay-key']
    )
  )

  fs.mkdirSync(logDir, {
    recursive: true
  })
  fs.mkdirSync(path.dirname(lockDir), {
    recursive: true
  })

  acquireRunLock(lockDir)
  let activeChild = null
  let shuttingDown = false

  const release = () => {
    releaseRunLock(lockDir)
  }

  const handleSignal = async signal => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(
      `· received ${signal}; stopping active child`
    )
    await terminateProcessGroup(activeChild)
    release()
    process.exit(
      signal === 'SIGINT' ? 130 : 143
    )
  }

  process.once('SIGINT', () => {
    handleSignal('SIGINT').catch(() => {
      release()
      process.exit(130)
    })
  })
  process.once('SIGTERM', () => {
    handleSignal('SIGTERM').catch(() => {
      release()
      process.exit(143)
    })
  })
  process.once('exit', release)

  try {
    const removed = cleanPartFiles(
      replayRoot
    )
    if (removed) {
      console.log(
        `· removed ${removed} stale .part files`
      )
    }

    console.log(
      'Course Worker · Final resilient E2E'
    )
    console.log(
      `Replay: ${args['replay-key']}`
    )
    console.log(
      `Worker ID: ${workerId}`
    )
    console.log(
      `Attempts: ${maxAttempts}`
    )
    console.log(
      `Startup grace: ${startupGraceMs / 1000}s`
    )
    console.log(
      `Stall threshold: ${stallMs / 1000}s`
    )

    const attempts = []
    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt += 1
    ) {
      if (attempt > 1 && retryDelayMs) {
        console.log(
          `· waiting ${retryDelayMs / 1000}s before retry`
        )
        await sleep(retryDelayMs)
      }

      const result = await runAttempt({
        attempt,
        args,
        workerId,
        replayRoot,
        reportRoot,
        logDir,
        startupGraceMs,
        stallMs,
        pollMs,
        onChild: child => {
          activeChild = child
        }
      })
      attempts.push(result)

      console.log(
        `· attempt ${attempt} result=` +
        `${result.classification.action} ` +
        `stage=${result.classification.stage || 'unknown'}`
      )
      if (
        result.classification.message
      ) {
        console.log(
          `· ${result.classification.message}`
        )
      }

      if (
        result.classification.action ===
        'success'
      ) {
        const summaryDir = path.join(
          reportRoot,
          `supervisor-${args['replay-key']}-${Date.now()}`
        )
        writeSupervisorSummary(
          summaryDir,
          {
            schemaVersion: 1,
            success: true,
            replayKey:
              args['replay-key'],
            workerId,
            attempts
          }
        )
        console.log(
          `✓ final resilient E2E succeeded`
        )
        console.log(
          `Supervisor summary: ${summaryDir}`
        )
        return
      }

      if (
        result.classification.action ===
        'stop'
      ) {
        throw new Error(
          result.classification.message ||
          `Stopped at ${result.classification.stage}`
        )
      }
    }

    const summaryDir = path.join(
      reportRoot,
      `supervisor-${args['replay-key']}-${Date.now()}`
    )
    writeSupervisorSummary(
      summaryDir,
      {
        schemaVersion: 1,
        success: false,
        replayKey:
          args['replay-key'],
        workerId,
        attempts
      }
    )
    throw new Error(
      `Reached ${maxAttempts} attempts without success`
    )
  } finally {
    release()
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
