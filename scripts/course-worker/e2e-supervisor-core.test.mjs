import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  classifyFreshReport,
  concurrencyForAttempt,
  latestFreshReport,
  progressSignature,
  shouldDeclareStall,
  stableWorkerId
} from './e2e-supervisor-core.mjs'

test('stable worker id remains deterministic', () => {
  const first = stableWorkerId(
    'replay-123',
    'worker host'
  )
  const second = stableWorkerId(
    'replay-123',
    'worker host'
  )
  assert.equal(first, second)
  assert.match(first, /^e2e-worker_host-/)
})

test('concurrency degrades across attempts', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(
      attempt => concurrencyForAttempt(attempt)
    ),
    [3, 2, 2, 1, 1, 1]
  )
})

test('startup grace prevents immediate stale detection', () => {
  assert.equal(
    shouldDeclareStall({
      now: 120_000,
      startedAt: 0,
      lastProgressAt: 0,
      startupGraceMs: 240_000,
      stallMs: 480_000
    }),
    false
  )
})

test('stall is based on current attempt progress time', () => {
  assert.equal(
    shouldDeclareStall({
      now: 800_000,
      startedAt: 100_000,
      lastProgressAt: 200_000,
      startupGraceMs: 240_000,
      stallMs: 480_000
    }),
    true
  )
})

test('queued report is retryable', () => {
  assert.equal(
    classifyFreshReport({
      success: false,
      finalTask: {
        stage: 'queued'
      },
      error: {
        message: 'Unexpected final stage: queued'
      }
    }).action,
    'retry'
  )
})

test('needs_attention stops automatically', () => {
  assert.equal(
    classifyFreshReport({
      finalTask: {
        stage: 'needs_attention'
      }
    }).action,
    'stop'
  )
})

test('awaiting_llm_window is success', () => {
  assert.equal(
    classifyFreshReport({
      finalTask: {
        stage: 'awaiting_llm_window'
      }
    }).action,
    'success'
  )
})

test('old reports are ignored', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'e2e-report-')
  )
  const oldDir = path.join(root, 'old')
  const freshDir = path.join(root, 'fresh')
  fs.mkdirSync(oldDir)
  fs.mkdirSync(freshDir)

  fs.writeFileSync(
    path.join(oldDir, 'report.json'),
    JSON.stringify({
      candidate: {
        replayKey: 'replay-1'
      },
      finalTask: {
        stage: 'queued'
      }
    })
  )
  const oldTime = new Date(Date.now() - 60_000)
  fs.utimesSync(
    path.join(oldDir, 'report.json'),
    oldTime,
    oldTime
  )

  fs.writeFileSync(
    path.join(freshDir, 'report.json'),
    JSON.stringify({
      candidate: {
        replayKey: 'replay-1'
      },
      finalTask: {
        stage: 'awaiting_llm_window'
      }
    })
  )

  const result = latestFreshReport(
    root,
    'replay-1',
    Date.now() - 5_000
  )
  assert.equal(
    result.report.finalTask.stage,
    'awaiting_llm_window'
  )
})

test('progress signature ignores stale timestamps', () => {
  assert.equal(
    progressSignature({
      completedResources: 2,
      bytes: 200,
      fragmentCount: 2,
      updatedAt: 'old'
    }),
    progressSignature({
      completedResources: 2,
      bytes: 200,
      fragmentCount: 2,
      updatedAt: 'new'
    })
  )
})
