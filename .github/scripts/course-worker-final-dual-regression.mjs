import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import '/app/scripts/course-worker/worker-env.mjs'
import adapter from '/app/scripts/course-worker/validated-course-adapter.mjs'
import {
  createValidatedAcquisitionRuntime
} from '/app/scripts/course-worker/runtime/acquisition-runtime.mjs'
import {
  createCoursePipelineWorkerClient
} from '/app/scripts/course-worker/pipeline-worker-client.mjs'
import {
  runClaimedCourseTask
} from '/app/scripts/course-worker/pipeline-runner-core.mjs'
import {
  drainCourseLlmTasks
} from '/app/scripts/course-worker/llm-drain-core.mjs'
import {
  verifyRegressionCleanup
} from '/app/scripts/course-worker/e2e-core.mjs'

const scratchRoot = path.resolve(
  process.env.COURSE_WORKER_SCRATCH_DIR || '/data/scratch'
)
const reportPath = path.join(
  process.env.COURSE_FINAL_REPORT_DIR || '/data/final-acceptance',
  'dual-regression.json'
)
const courseInputs = [
  String(process.env.COURSE_TEST_A || '').trim(),
  String(process.env.COURSE_TEST_B || '').trim()
]
const workerId = String(
  process.env.COURSE_WORKER_ID || `final-acceptance-${Date.now()}`
).replace(/[^A-Za-z0-9._:-]/g, '_')
const claimWaitMs = Math.max(
  5 * 60 * 1000,
  Number(process.env.COURSE_TEST_CLAIM_WAIT_MS || 50 * 60 * 1000)
)

function safeProgress(message) {
  console.log(`SAFE_PROGRESS ${new Date().toISOString()} ${message}`)
}

function clean(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim()
}

function parseStart(value) {
  const raw = String(value || '').trim()
  const normalized = raw.includes('T')
    ? raw
    : raw.replace(' ', 'T')
  const withZone =
    /(?:Z|[+-]\d\d:\d\d)$/.test(normalized)
      ? normalized
      : `${normalized}+08:00`
  const parsed = Date.parse(withZone)
  return Number.isFinite(parsed)
    ? parsed
    : Number.MAX_SAFE_INTEGER
}

function taskFrom(value) {
  return value?.task || value || null
}

async function readTask(client, replayKey) {
  return taskFrom(await client.get(replayKey))
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function selectExactCourse(discovery, requested) {
  const courses = discovery.courses || []
  const exact = courses.filter(course =>
    clean(course.courseName) === clean(requested) ||
    clean(course.normalizedName) === clean(requested)
  )
  if (exact.length === 1) return exact[0]
  if (courses.length === 1) return courses[0]
  throw new Error(
    `course selector is ambiguous for requested course (${courses.length})`
  )
}

function firstRecording(course) {
  const recordings = [...(course.recordings || [])]
    .filter(item => item.replayKey)
    .sort((left, right) => {
      const byDate =
        parseStart(left.startsAtText) -
        parseStart(right.startsAtText)
      if (byDate) return byDate
      return String(left.title || '').localeCompare(
        String(right.title || ''),
        'zh-CN'
      )
    })
  if (!recordings.length) {
    throw new Error('selected course has no classroom replay')
  }
  const recording = recordings[0]
  return {
    courseKey: course.courseKey,
    courseName: course.courseName,
    replayKey: recording.replayKey,
    title: recording.title,
    startsAtText: recording.startsAtText,
    teacher: recording.teacher
  }
}

function isMediaComplete(stage) {
  return [
    'awaiting_llm_window',
    'writing',
    'completed'
  ].includes(String(stage || ''))
}

function hardAttention(task) {
  if (task?.stage !== 'needs_attention') return false
  return !(
    task?.last_error?.kind === 'llm_workflow_attention' &&
    [
      'waiting-node-human-review',
      'waiting-final-human-review',
      'node_human_review',
      'final_review_human',
      'final-review-current'
    ].includes(String(task?.last_error?.code || ''))
  )
}

async function claimWithWait(client, candidate, slot) {
  const deadline = Date.now() + claimWaitMs
  let attempts = 0
  while (Date.now() < deadline) {
    const current = await readTask(client, candidate.replayKey)
    if (isMediaComplete(current?.stage)) {
      return {
        task: null,
        current,
        reason: 'media-already-complete'
      }
    }
    if (hardAttention(current)) {
      throw new Error(
        `slot ${slot} entered hard attention (${current?.last_error?.kind || 'unknown'})`
      )
    }

    const claimed = await client.claimSpecific(
      candidate.replayKey,
      {
        workerId,
        leaseSeconds: 3600
      }
    )
    if (claimed.task) {
      return {
        task: claimed.task,
        current: claimed.task,
        reason: 'claimed'
      }
    }

    attempts += 1
    safeProgress(
      `slot=${slot} waiting_for_lease attempt=${attempts} stage=${current?.stage || 'unknown'}`
    )
    await sleep(60_000)
  }

  throw new Error(`slot ${slot} could not be claimed before lease wait deadline`)
}

function startStagePoll(client, candidate, slot, label) {
  let busy = false
  const timer = setInterval(async () => {
    if (busy) return
    busy = true
    try {
      const current = await readTask(client, candidate.replayKey)
      safeProgress(
        `slot=${slot} ${label} stage=${current?.stage || 'unknown'}`
      )
    } catch {
      safeProgress(`slot=${slot} ${label} stage=poll-error`)
    } finally {
      busy = false
    }
  }, 60_000)
  timer.unref?.()
  return timer
}

async function main() {
  if (courseInputs.some(item => !item)) {
    throw new Error('COURSE_TEST_A / COURSE_TEST_B are required')
  }
  if (clean(courseInputs[0]) === clean(courseInputs[1])) {
    throw new Error('two distinct courses are required')
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  const startedAt = new Date().toISOString()
  const runtime = createValidatedAcquisitionRuntime({
    scratchRoot
  })
  const selected = []

  safeProgress('phase=discovery status=started')
  try {
    for (let index = 0; index < courseInputs.length; index += 1) {
      const discovery = await runtime.discover({
        courseName: courseInputs[index]
      })
      const course = selectExactCourse(
        discovery,
        courseInputs[index]
      )
      selected.push(firstRecording(course))
      safeProgress(
        `phase=discovery slot=${index === 0 ? 'A' : 'B'} status=selected`
      )
    }
  } finally {
    await runtime.close()
  }

  if (selected[0].replayKey === selected[1].replayKey) {
    throw new Error('two selectors resolved to the same replay')
  }

  const client = createCoursePipelineWorkerClient()
  const discoverResult = await client.discover(selected)
  safeProgress(
    `phase=registration submitted=2 added=${Number(discoverResult.addedCount || 0)}`
  )

  const initialTasks = []
  for (const candidate of selected) {
    initialTasks.push(
      await readTask(client, candidate.replayKey)
    )
  }

  const mediaResults = []
  for (let index = 0; index < selected.length; index += 1) {
    const candidate = selected[index]
    const slot = index === 0 ? 'A' : 'B'
    const claim = await claimWithWait(
      client,
      candidate,
      slot
    )

    if (!claim.task) {
      mediaResults.push({
        slot,
        replayKey: candidate.replayKey,
        status: claim.reason,
        stage: claim.current?.stage || ''
      })
      safeProgress(
        `slot=${slot} media status=${claim.reason} stage=${claim.current?.stage || 'unknown'}`
      )
      continue
    }

    safeProgress(`slot=${slot} media status=started`)
    const poll = startStagePoll(
      client,
      candidate,
      slot,
      'media'
    )
    try {
      const result = await runClaimedCourseTask({
        client,
        adapter,
        task: claim.task,
        workerId,
        leaseSeconds: 3600,
        heartbeatEveryMs: 60_000,
        log: () => {}
      })
      mediaResults.push({
        slot,
        replayKey: candidate.replayKey,
        status: result.status,
        stage: result.task?.stage || ''
      })
      safeProgress(
        `slot=${slot} media status=${result.status} stage=${result.task?.stage || 'unknown'}`
      )
    } finally {
      clearInterval(poll)
    }
  }

  const llmRounds = []
  const llmDeadline = Date.now() + 2 * 60 * 60 * 1000
  for (let round = 1; round <= 12; round += 1) {
    const tasks = []
    for (const candidate of selected) {
      tasks.push(
        await readTask(client, candidate.replayKey)
      )
    }

    safeProgress(
      `phase=llm round=${round} stages=${tasks.map(task => task?.stage || 'unknown').join(',')}`
    )

    if (tasks.every(task => task?.stage === 'completed')) {
      break
    }
    if (tasks.some(hardAttention)) {
      break
    }

    const eligible = tasks.filter(task =>
      [
        'awaiting_llm_window',
        'writing',
        'needs_attention'
      ].includes(String(task?.stage || ''))
    )
    if (!eligible.length || Date.now() >= llmDeadline) {
      break
    }

    const polls = selected.map((candidate, index) =>
      startStagePoll(
        client,
        candidate,
        index === 0 ? 'A' : 'B',
        'llm'
      )
    )
    try {
      const drained = await drainCourseLlmTasks({
        client,
        tasks: eligible,
        allowAll: true,
        maxTasks: 2,
        maxBatchesPerTask: 160,
        maxBatches: 320,
        costMode: 'economy',
        sleep
      })
      llmRounds.push({
        round,
        selected: drained.selected,
        batches: drained.batches,
        stages: drained.results.map(
          item => item.task?.stage || ''
        )
      })
    } finally {
      for (const poll of polls) clearInterval(poll)
    }

    const latest = []
    for (const candidate of selected) {
      latest.push(
        await readTask(client, candidate.replayKey)
      )
    }
    if (latest.every(task => task?.stage === 'completed')) {
      break
    }
    await sleep(5_000)
  }

  const finalTasks = []
  const cleanup = []
  for (const candidate of selected) {
    const task = await readTask(
      client,
      candidate.replayKey
    )
    finalTasks.push(task)
    cleanup.push(
      verifyRegressionCleanup(
        scratchRoot,
        task
      )
    )
  }

  const success =
    finalTasks.every(task => task?.stage === 'completed') &&
    cleanup.every(item =>
      item.mediaDeleted === true &&
      item.fragmentsDeleted === true
    )

  const report = {
    schemaVersion: 2,
    event: 'course_final_dual_regression',
    startedAt,
    finishedAt: new Date().toISOString(),
    workerId,
    success,
    discovery: {
      submitted: selected.length,
      addedCount: Number(discoverResult.addedCount || 0)
    },
    selections: selected.map((candidate, index) => ({
      slot: index === 0 ? 'A' : 'B',
      startsAtText: candidate.startsAtText,
      replayKey: candidate.replayKey
    })),
    initial: initialTasks.map((task, index) => ({
      slot: index === 0 ? 'A' : 'B',
      stage: task?.stage || ''
    })),
    mediaResults,
    llmRounds,
    final: finalTasks.map((task, index) => ({
      slot: index === 0 ? 'A' : 'B',
      replayKey: task?.replay_key || '',
      stage: task?.stage || '',
      errorKind: task?.last_error?.kind || '',
      errorCode: task?.last_error?.code || '',
      retryable: Boolean(task?.last_error?.retryable),
      cleanup: cleanup[index]
    }))
  }

  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2) + '\n'
  )

  safeProgress(
    `phase=dual-regression success=${success} final=${finalTasks.map(task => task?.stage || 'unknown').join(',')}`
  )

  if (!success) {
    const error = new Error(
      'dual-course regression did not reach completed for both slots'
    )
    error.code = 'COURSE_DUAL_REGRESSION_INCOMPLETE'
    throw error
  }
}

main().catch(error => {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  if (!fs.existsSync(reportPath)) {
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        schemaVersion: 2,
        event: 'course_final_dual_regression',
        success: false,
        error: {
          code: String(error?.code || ''),
          message: String(error?.message || error)
        }
      }, null, 2) + '\n'
    )
  }
  console.error(
    `SAFE_PROGRESS ${new Date().toISOString()} phase=dual-regression success=false code=${String(error?.code || '')}`
  )
  process.exitCode = 2
})
