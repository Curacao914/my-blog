import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import '/app/scripts/course-worker/worker-env.mjs'
import {
  createValidatedAcquisitionRuntime
} from '/app/scripts/course-worker/runtime/acquisition-runtime.mjs'
import {
  createCoursePipelineWorkerClient
} from '/app/scripts/course-worker/pipeline-worker-client.mjs'

const reportPath = path.join(
  process.env.COURSE_FINAL_REPORT_DIR || '/data/final-acceptance',
  process.env.COURSE_IDEMPOTENCY_REPORT_NAME || 'idempotency.json'
)
const courseInputs = [
  String(process.env.COURSE_TEST_A || '').trim(),
  String(process.env.COURSE_TEST_B || '').trim()
]

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

function selectCourse(discovery, requested) {
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
  const item = recordings[0]
  return {
    courseKey: course.courseKey,
    courseName: course.courseName,
    replayKey: item.replayKey,
    title: item.title,
    startsAtText: item.startsAtText,
    teacher: item.teacher
  }
}

function taskFrom(value) {
  return value?.task || value || null
}

async function main() {
  if (courseInputs.some(item => !item)) {
    throw new Error('COURSE_TEST_A / COURSE_TEST_B are required')
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  safeProgress('phase=idempotency discovery=started')

  const runtime = createValidatedAcquisitionRuntime()
  const selected = []
  try {
    for (const requested of courseInputs) {
      const discovery = await runtime.discover({
        courseName: requested
      })
      selected.push(
        firstRecording(
          selectCourse(discovery, requested)
        )
      )
    }
  } finally {
    await runtime.close()
  }

  const client = createCoursePipelineWorkerClient()
  const before = []
  for (const candidate of selected) {
    before.push(
      taskFrom(
        await client.get(candidate.replayKey)
      )
    )
  }

  const first = await client.discover(selected)
  const second = await client.discover(selected)

  const after = []
  for (const candidate of selected) {
    after.push(
      taskFrom(
        await client.get(candidate.replayKey)
      )
    )
  }

  const success =
    Number(first.addedCount || 0) === 0 &&
    Number(second.addedCount || 0) === 0 &&
    before.every(task => task?.stage === 'completed') &&
    after.every(task => task?.stage === 'completed') &&
    before.every((task, index) =>
      task?.replay_key === after[index]?.replay_key
    )

  const report = {
    schemaVersion: 1,
    event: 'course_pipeline_idempotency',
    success,
    firstAddedCount: Number(first.addedCount || 0),
    secondAddedCount: Number(second.addedCount || 0),
    before: before.map((task, index) => ({
      slot: index === 0 ? 'A' : 'B',
      stage: task?.stage || '',
      replayKey: task?.replay_key || ''
    })),
    after: after.map((task, index) => ({
      slot: index === 0 ? 'A' : 'B',
      stage: task?.stage || '',
      replayKey: task?.replay_key || ''
    })),
    asrInvoked: false,
    mediaRunnerInvoked: false,
    llmRunnerInvoked: false
  }

  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2) + '\n'
  )

  safeProgress(
    `phase=idempotency success=${success} first_added=${report.firstAddedCount} second_added=${report.secondAddedCount}`
  )

  if (!success) {
    const error = new Error(
      'idempotency check failed'
    )
    error.code = 'COURSE_IDEMPOTENCY_FAILED'
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
        event: 'course_pipeline_idempotency',
        success: false,
        error: {
          code: String(error?.code || ''),
          message: String(error?.message || error)
        }
      }, null, 2) + '\n'
    )
  }
  console.error(
    `SAFE_PROGRESS ${new Date().toISOString()} phase=idempotency success=false code=${String(error?.code || '')}`
  )
  process.exitCode = 2
})
