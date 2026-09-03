import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function clampInteger(
  value,
  fallback,
  minimum,
  maximum
) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(
    minimum,
    Math.min(maximum, Math.round(parsed))
  )
}

export function stableWorkerId(
  replayKey,
  hostname = os.hostname()
) {
  const digest = crypto
    .createHash('sha256')
    .update(String(replayKey || 'unknown'))
    .digest('hex')
    .slice(0, 12)
  const safeHost = String(hostname || 'worker')
    .replace(/[^A-Za-z0-9._:-]/g, '_')
    .slice(0, 80)
  return `e2e-${safeHost}-${digest}`
}

export function concurrencyForAttempt(
  attempt,
  plan = [3, 2, 2, 1, 1]
) {
  const index = Math.max(0, Number(attempt || 1) - 1)
  const source = Array.isArray(plan) && plan.length
    ? plan
    : [1]
  return clampInteger(
    source[Math.min(index, source.length - 1)],
    1,
    1,
    8
  )
}

export function progressSignature(snapshot = {}) {
  return [
    Number(snapshot.completedResources || 0),
    Number(snapshot.bytes || 0),
    Number(snapshot.fragmentCount || 0)
  ].join(':')
}

export function shouldDeclareStall(input = {}) {
  const now = Number(input.now || Date.now())
  const startedAt = Number(input.startedAt || now)
  const lastProgressAt = Number(
    input.lastProgressAt || startedAt
  )
  const startupGraceMs = Math.max(
    0,
    Number(input.startupGraceMs || 0)
  )
  const stallMs = Math.max(
    1,
    Number(input.stallMs || 1)
  )

  if (now - startedAt < startupGraceMs) return false
  return now - lastProgressAt >= stallMs
}

export function isTransientFailure(
  stage,
  message = ''
) {
  if (
    ['queued', 'downloading', 'failed'].includes(
      String(stage || '')
    )
  ) {
    return true
  }
  return /timeout|timed out|network|socket|aborted|fetch failed|econn|enet|429|502|503|504|媒体请求多次失败|连接|超时/i.test(
    String(message || '')
  )
}

export function classifyFreshReport(report = {}) {
  const task = report.finalTask || {}
  const stage = String(task.stage || '')
  const error = report.error || {}
  const message = String(
    error.message ||
    task.last_error?.message ||
    ''
  )

  if (
    report.success === true ||
    stage === 'awaiting_llm_window'
  ) {
    return {
      action: 'success',
      stage,
      message
    }
  }

  if (stage === 'needs_attention') {
    return {
      action: 'stop',
      stage,
      message
    }
  }

  if (isTransientFailure(stage, message)) {
    return {
      action: 'retry',
      stage,
      message
    }
  }

  return {
    action: 'stop',
    stage,
    message:
      message || `Unexpected final stage: ${stage || 'unknown'}`
  }
}

export function listFreshReports(
  reportRoot,
  replayKey,
  startedAtMs
) {
  const root = path.resolve(reportRoot)
  if (!fs.existsSync(root)) return []

  const result = []
  for (const entry of fs.readdirSync(root, {
    withFileTypes: true
  })) {
    if (!entry.isDirectory()) continue
    const reportPath = path.join(
      root,
      entry.name,
      'report.json'
    )
    if (!fs.existsSync(reportPath)) continue

    const stat = fs.statSync(reportPath)
    if (stat.mtimeMs < Number(startedAtMs || 0) - 5_000) {
      continue
    }

    try {
      const report = JSON.parse(
        fs.readFileSync(reportPath, 'utf8')
      )
      if (
        report.candidate?.replayKey !== replayKey
      ) {
        continue
      }
      result.push({
        reportPath,
        mtimeMs: stat.mtimeMs,
        report
      })
    } catch {
      // Ignore incomplete report writes.
    }
  }

  return result.sort(
    (left, right) => right.mtimeMs - left.mtimeMs
  )
}

export function latestFreshReport(
  reportRoot,
  replayKey,
  startedAtMs
) {
  return listFreshReports(
    reportRoot,
    replayKey,
    startedAtMs
  )[0] || null
}

export function readProgressSnapshot(
  replayRoot
) {
  const root = path.resolve(replayRoot)
  const progressPath = path.join(
    root,
    'download-progress.json'
  )

  if (fs.existsSync(progressPath)) {
    try {
      const progress = JSON.parse(
        fs.readFileSync(progressPath, 'utf8')
      )
      return {
        source: 'progress-file',
        completedResources: Number(
          progress.completedResources || 0
        ),
        totalResources: Number(
          progress.totalResources || 0
        ),
        bytes: Number(progress.bytes || 0),
        fragmentCount: Number(
          progress.completedResources || 0
        ),
        updatedAt:
          String(progress.updatedAt || '')
      }
    } catch {
      // Fall through to filesystem inspection.
    }
  }

  const fragments = path.join(root, 'fragments')
  let fragmentCount = 0
  let bytes = 0

  if (fs.existsSync(fragments)) {
    for (const track of fs.readdirSync(
      fragments,
      { withFileTypes: true }
    )) {
      const trackPath = path.join(
        fragments,
        track.name
      )
      if (!track.isDirectory()) continue
      for (const file of fs.readdirSync(
        trackPath,
        { withFileTypes: true }
      )) {
        if (!file.isFile()) continue
        if (
          file.name.endsWith('.part') ||
          file.name.endsWith('.m3u8')
        ) {
          continue
        }
        const filePath = path.join(
          trackPath,
          file.name
        )
        const stat = fs.statSync(filePath)
        fragmentCount += 1
        bytes += stat.size
      }
    }
  }

  return {
    source: 'fragments',
    completedResources: fragmentCount,
    totalResources: 0,
    bytes,
    fragmentCount,
    updatedAt: ''
  }
}

export function acquireRunLock(
  lockDir,
  pid = process.pid
) {
  const target = path.resolve(lockDir)
  try {
    fs.mkdirSync(target, {
      recursive: false
    })
  } catch (error) {
    const pidPath = path.join(target, 'pid')
    let existingPid = 0
    try {
      existingPid = Number(
        fs.readFileSync(pidPath, 'utf8').trim()
      )
    } catch {
      existingPid = 0
    }

    if (existingPid > 0) {
      try {
        process.kill(existingPid, 0)
        const lockError = new Error(
          `A resilient E2E supervisor is already running (PID ${existingPid})`
        )
        lockError.code = 'E2E_LOCKED'
        throw lockError
      } catch (signalError) {
        if (signalError?.code === 'E2E_LOCKED') {
          throw signalError
        }
      }
    }

    fs.rmSync(target, {
      recursive: true,
      force: true
    })
    fs.mkdirSync(target)
  }

  fs.writeFileSync(
    path.join(target, 'pid'),
    `${pid}\n`
  )
  return target
}

export function releaseRunLock(lockDir) {
  fs.rmSync(
    path.resolve(lockDir),
    {
      recursive: true,
      force: true
    }
  )
}
