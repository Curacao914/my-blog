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
  process.env.COURSE_DUAL_REPORT_DIR || '/data/dual-regression',
  'report.json'
)
const courseInputs = [
  String(process.env.COURSE_TEST_A || '').trim(),
  String(process.env.COURSE_TEST_B || '').trim()
]
const workerId = String(
  process.env.COURSE_WORKER_ID || `dual-regression-${Date.now()}`
).replace(/[^A-Za-z0-9._:-]/g, '_')
const forceRetry =
  String(process.env.COURSE_TEST_FORCE_RETRY || '0') === '1'

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

function selectExactCourse(discovery, requested) {
  const courses = discovery.courses || []
  const exact = courses.filter(course =>
    clean(course.courseName) === clean(requested) ||
    clean(course.normalizedName) === clean(requested)
  )
  if (exact.length === 1) return exact[0]
  if (courses.length === 1) return courses[0]
  throw new Error(
    `课程选择不唯一：${requested} 匹配 ${courses.length} 门课程`
  )
}

function firstRecording(course, requested) {
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
    throw new Error(`课程没有可用课堂实录：${requested}`)
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

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  if (courseInputs.some(item => !item)) {
    throw new Error('COURSE_TEST_A / COURSE_TEST_B are required')
  }
  if (clean(courseInputs[0]) === clean(courseInputs[1])) {
    throw new Error('双课程回归需要两门不同课程')
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  const startedAt = new Date().toISOString()
  const runtime = createValidatedAcquisitionRuntime({
    scratchRoot
  })
  const selected = []
  try {
    for (const requested of courseInputs) {
      const discovery = await runtime.discover({
        courseName: requested
      })
      const course = selectExactCourse(discovery, requested)
      selected.push(firstRecording(course, requested))
    }
  } finally {
    await runtime.close()
  }

  if (selected[0].replayKey === selected[1].replayKey) {
    throw new Error('两门课程意外选中了同一回放')
  }

  const client = createCoursePipelineWorkerClient()
  const discoverResult = await client.discover(selected)
  const initialTasks = []
  for (const candidate of selected) {
    initialTasks.push(await readTask(client, candidate.replayKey))
  }

  const alreadyCompleted = initialTasks
    .filter(task => task?.stage === 'completed')

  if (alreadyCompleted.length && !forceRetry) {
    const error = new Error(
      `选中的首节课已有 ${alreadyCompleted.length} 节 completed；` +
      '为避免重复计费，测试已停止。'
    )
    error.code = 'COURSE_TEST_ALREADY_COMPLETED'
    throw error
  }

  if (forceRetry) {
    for (const candidate of selected) {
      const current = await readTask(client, candidate.replayKey)
      if (
        ['completed', 'failed', 'needs_attention'].includes(
          String(current?.stage || '')
        )
      ) {
        await client.retry(
          candidate.replayKey,
          'controlled-dual-course-regression'
        )
      }
    }
  }

  const mediaResults = []
  for (let index = 0; index < selected.length; index += 1) {
    const candidate = selected[index]
    const slot = index === 0 ? 'A' : 'B'
    const task = await readTask(client, candidate.replayKey)

    if (
      ['awaiting_llm_window', 'writing', 'completed'].includes(
        String(task?.stage || '')
      )
    ) {
      mediaResults.push({
        slot,
        replayKey: candidate.replayKey,
        status: 'media-already-complete',
        stage: task.stage
      })
      continue
    }

    const claimed = await client.claimSpecific(
      candidate.replayKey,
      {
        workerId,
        leaseSeconds: 3600
      }
    )
    if (!claimed.task) {
      mediaResults.push({
        slot,
        replayKey: candidate.replayKey,
        status: 'not-claimed',
        stage: task?.stage || ''
      })
      continue
    }

    const result = await runClaimedCourseTask({
      client,
      adapter,
      task: claimed.task,
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
  }

  const llmRounds = []
  const llmDeadline = Date.now() + 2 * 60 * 60 * 1000
  for (let round = 1; round <= 12; round += 1) {
    const tasks = []
    for (const candidate of selected) {
      tasks.push(await readTask(client, candidate.replayKey))
    }
    if (tasks.every(task => task?.stage === 'completed')) break
    if (tasks.some(hardAttention)) break

    const eligible = tasks.filter(task =>
      ['awaiting_llm_window', 'writing', 'needs_attention'].includes(
        String(task?.stage || '')
      )
    )
    if (!eligible.length || Date.now() >= llmDeadline) break

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
      stages: drained.results.map(item => item.task?.stage || '')
    })

    const latest = []
    for (const candidate of selected) {
      latest.push(await readTask(client, candidate.replayKey))
    }
    if (latest.every(task => task?.stage === 'completed')) break
    await sleep(5_000)
  }

  const finalTasks = []
  const cleanup = []
  for (const candidate of selected) {
    const task = await readTask(client, candidate.replayKey)
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
    schemaVersion: 1,
    event: 'dual_course_real_regression',
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
      courseName: candidate.courseName,
      title: candidate.title,
      startsAtText: candidate.startsAtText,
      replayKey: candidate.replayKey
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

  if (!success) {
    const error = new Error(
      '双课程真实回归未全部完成；请查看安全摘要。'
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
        schemaVersion: 1,
        event: 'dual_course_real_regression',
        success: false,
        error: {
          code: String(error?.code || ''),
          message: String(error?.message || error)
        }
      }, null, 2) + '\n'
    )
  }
  console.error(
    `✗ ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 2
})
