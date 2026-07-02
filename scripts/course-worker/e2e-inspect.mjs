#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import './worker-env.mjs'
import {
  readProgressSnapshot
} from './e2e-supervisor-core.mjs'

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

function listReports(
  reportRoot,
  replayKey
) {
  if (!fs.existsSync(reportRoot)) return []
  const result = []

  for (const entry of fs.readdirSync(
    reportRoot,
    { withFileTypes: true }
  )) {
    if (!entry.isDirectory()) continue
    const reportPath = path.join(
      reportRoot,
      entry.name,
      'report.json'
    )
    if (!fs.existsSync(reportPath)) continue
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
        mtimeMs:
          fs.statSync(reportPath).mtimeMs,
        success:
          Boolean(report.success),
        stage:
          report.finalTask?.stage || '',
        workerId:
          report.workerId || '',
        error:
          report.error?.message || ''
      })
    } catch {
      // Ignore unreadable reports.
    }
  }

  return result
    .sort(
      (left, right) =>
        right.mtimeMs - left.mtimeMs
    )
    .slice(0, 10)
}

const args = parseArgs(process.argv)
const replayKey = String(
  args['replay-key'] || ''
).trim()
if (!replayKey) {
  console.error(
    '✗ --replay-key is required'
  )
  process.exit(1)
}

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
  replayKey
)
const reportRoot = path.join(
  scratchRoot,
  'reports'
)
const lockDir = path.join(
  scratchRoot,
  'locks',
  `${replayKey}.final.lock`
)

const result = {
  replayKey,
  replayRoot,
  lock: {
    active:
      fs.existsSync(lockDir),
    pid: (() => {
      try {
        return Number(
          fs.readFileSync(
            path.join(lockDir, 'pid'),
            'utf8'
          ).trim()
        )
      } catch {
        return 0
      }
    })()
  },
  progress:
    readProgressSnapshot(replayRoot),
  files: {
    media:
      fs.existsSync(
        path.join(
          replayRoot,
          'output',
          'media.mp4'
        )
      ),
    transcript:
      fs.existsSync(
        path.join(
          replayRoot,
          'transcript',
          'raw-transcript.md'
        )
      ),
    textpack:
      fs.existsSync(
        path.join(
          replayRoot,
          'textpack',
          'course-textpack.json'
        )
      )
  },
  reports:
    listReports(
      reportRoot,
      replayKey
    )
}

console.log(
  JSON.stringify(result, null, 2)
)
