#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {
  spawnSync
} from 'node:child_process'

import './worker-env.mjs'
import adapter from './validated-course-adapter.mjs'
import {
  buildRegressionReport,
  verifyRegressionCleanup,
  writeRegressionReport
} from './e2e-core.mjs'
import {
  stableWorkerId
} from './e2e-supervisor-core.mjs'
import {
  discoverAndProbeMedia,
  probeMediaFile,
  seedMediaFile,
  selectAutomaticMedia,
  sha256File
} from './local-media-core.mjs'
import {
  runClaimedCourseTask
} from './pipeline-runner-core.mjs'
import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'

function parseArgs(argv) {
  const result = {
    roots: []
  }
  for (
    let index = 2;
    index < argv.length;
    index += 1
  ) {
    const value = argv[index]
    if (value === '--root') {
      result.roots.push(
        argv[++index]
      )
      continue
    }
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
  const result =
    String(value || '').trim()
  if (!result) {
    throw new Error(
      `${name} is required`
    )
  }
  return result
}

function sleep(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  )
}

function commandOk(
  command,
  args
) {
  if (!command) return false
  const result = spawnSync(
    command,
    args,
    {
      stdio: 'ignore',
      env: process.env
    }
  )
  return result.status === 0
}

async function downstreamPreflight(
  client
) {
  const requiredNames = [
    'COURSE_CONTROL_PLANE_URL',
    'COURSE_WORKER_SECRET',
    'DASHSCOPE_API_KEY',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET'
  ]
  const missing =
    requiredNames.filter(
      name =>
        !String(
          process.env[name] || ''
        ).trim()
    )

  const python =
    process.env.COURSE_PYTHON ||
    'python3'
  const checks = {
    ffprobe:
      commandOk(
        process.env.COURSE_FFPROBE ||
        'ffprobe',
        ['-version']
      ),
    python:
      commandOk(
        python,
        ['--version']
      ),
    boto3:
      commandOk(
        python,
        ['-c', 'import boto3']
      )
  }

  let controlPlane = {
    ok: false,
    error: ''
  }
  try {
    const listed =
      await client.list({
        limit: 1
      })
    controlPlane = {
      ok: true,
      taskCount:
        listed.summary?.total ?? null
    }
  } catch (error) {
    controlPlane = {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error)
    }
  }

  const result = {
    ok:
      missing.length === 0 &&
      Object.values(checks)
        .every(Boolean) &&
      controlPlane.ok,
    missing,
    checks,
    controlPlane
  }

  console.log(
    JSON.stringify(
      {
        downstreamPreflight: result
      },
      null,
      2
    )
  )
  if (!result.ok) {
    throw new Error(
      'Downstream preflight failed'
    )
  }
}

function candidateFromTask(
  task,
  fallback
) {
  return {
    courseKey:
      task?.course_key ||
      fallback.courseKey,
    courseName:
      task?.course_name ||
      fallback.courseName,
    replayKey:
      task?.replay_key ||
      fallback.replayKey,
    title:
      task?.title ||
      fallback.title,
    startsAtText:
      task?.starts_at_text ||
      fallback.startsAtText,
    teacher:
      task?.teacher ||
      fallback.teacher
  }
}

async function ensureTask(
  client,
  candidate
) {
  try {
    const response =
      await client.get(
        candidate.replayKey
      )
    if (response.task) {
      return response.task
    }
  } catch (error) {
    if (Number(error?.status || 0) !== 404) {
      throw error
    }
  }

  await client.discover([
    candidate
  ])
  const response =
    await client.get(
      candidate.replayKey
    )
  if (!response.task) {
    throw new Error(
      'Control plane did not create the replay task'
    )
  }
  return response.task
}

function resolveMediaPath(
  args
) {
  const media = String(
    args.media || 'auto'
  )
  if (media !== 'auto') {
    return {
      selected:
        probeMediaFile(media),
      candidates: []
    }
  }

  const expectedDurationSeconds =
    Number(
      args['expected-duration'] ||
      10_774
    )
  const toleranceSeconds =
    Number(
      args.tolerance ||
      20 * 60
    )
  const candidates =
    discoverAndProbeMedia({
      roots: args.roots,
      expectedDurationSeconds,
      toleranceSeconds,
      recentDays:
        Number(
          args['recent-days'] || 60
        ),
      maximumFiles:
        Number(args.limit || 40)
    })
  const selected =
    selectAutomaticMedia(
      candidates,
      {
        expectedDurationSeconds,
        toleranceSeconds
      }
    )
  return {
    selected,
    candidates
  }
}

async function main() {
  const args = parseArgs(
    process.argv
  )
  const replayKey = required(
    args['replay-key'],
    '--replay-key'
  )
  const fallbackCandidate = {
    replayKey,
    courseKey: required(
      args['course-key'],
      '--course-key'
    ),
    courseName: required(
      args.course,
      '--course'
    ),
    title: required(
      args.title,
      '--title'
    ),
    startsAtText:
      String(
        args['starts-at'] || ''
      ),
    teacher:
      String(args.teacher || '')
  }
  const workerId =
    String(
      args['worker-id'] ||
      process.env.COURSE_WORKER_ID ||
      stableWorkerId(replayKey)
    )
  const maxAttempts =
    Math.max(
      1,
      Math.min(
        8,
        Number(args.attempts || 4)
      )
    )
  const retryDelayMs =
    Math.max(
      0,
      Number(
        args['retry-delay-seconds'] ||
        60
      ) * 1000
    )

  const scratchRoot = path.resolve(
    process.env
      .COURSE_WORKER_SCRATCH_DIR ||
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
  const targetMedia = path.join(
    replayRoot,
    'output',
    'media.mp4'
  )
  const reportDir = path.join(
    scratchRoot,
    'reports',
    `local-media-${replayKey}-${Date.now()}`
  )

  const client =
    createCoursePipelineWorkerClient()
  await downstreamPreflight(
    client
  )

  const {
    selected,
    candidates
  } = resolveMediaPath(args)

  console.log(
    `Selected local media: ${selected.filePath}`
  )
  console.log(
    `Duration: ${selected.durationSeconds.toFixed(1)}s`
  )
  console.log(
    `Bytes: ${selected.bytes}`
  )

  let sourcePath =
    path.resolve(selected.filePath)
  if (
    sourcePath ===
    path.resolve(targetMedia)
  ) {
    const checksum =
      await sha256File(sourcePath)
    const libraryPath = path.join(
      scratchRoot,
      'media-library',
      `${checksum}.mp4`
    )
    if (!fs.existsSync(libraryPath)) {
      seedMediaFile(
        sourcePath,
        libraryPath
      )
    }
    sourcePath = libraryPath
    console.log(
      `Preserved source in media library: ${libraryPath}`
    )
  }

  const checksum =
    await sha256File(sourcePath)
  const seeded =
    seedMediaFile(
      sourcePath,
      targetMedia
    )
  const seededInfo =
    probeMediaFile(targetMedia)

  fs.mkdirSync(
    replayRoot,
    {
      recursive: true
    }
  )
  fs.writeFileSync(
    path.join(
      replayRoot,
      'local-media-seed.json'
    ),
    JSON.stringify({
      schemaVersion: 1,
      replayKey,
      sourceFileName:
        path.basename(sourcePath),
      targetScratchKey:
        path.relative(
          scratchRoot,
          targetMedia
        ),
      checksum,
      durationSeconds:
        seededInfo.durationSeconds,
      bytes:
        seededInfo.bytes,
      mode:
        seeded.mode,
      seededAt:
        new Date().toISOString()
    }, null, 2) + '\n'
  )

  let task =
    await ensureTask(
      client,
      fallbackCandidate
    )
  const candidate =
    candidateFromTask(
      task,
      fallbackCandidate
    )
  const stageTimeline = []
  let finalTask = task
  let cleanup = null
  let caught = null
  const startedAt =
    new Date().toISOString()

  try {
    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt += 1
    ) {
      if (
        attempt > 1 &&
        retryDelayMs
      ) {
        console.log(
          `· waiting ${retryDelayMs / 1000}s before downstream retry`
        )
        await sleep(retryDelayMs)
      }

      const seededTask =
        await client.report(
          replayKey,
          {
            stage: 'downloaded',
            artifacts: {
              mediaScratchKey:
                path.relative(
                  scratchRoot,
                  targetMedia
                ),
              mediaChecksum:
                checksum
            },
            runtime: {
              durationSeconds:
                seededInfo.durationSeconds,
              mediaBytes:
                seededInfo.bytes,
              localMediaSeeded:
                true,
              localMediaSeedMode:
                seeded.mode
            },
            markAttempt: false,
            reason:
              attempt === 1
                ? 'seed-local-media'
                : 'resume-downstream-from-local-media'
          }
        )
      task = seededTask.task
      stageTimeline.push({
        at:
          new Date().toISOString(),
        stage: 'downloaded'
      })

      const claimed =
        await client.claimSpecific(
          replayKey,
          {
            workerId,
            leaseSeconds: 1800
          }
        )
      if (!claimed.task) {
        throw new Error(
          'The local-media task could not be claimed; use the prior worker ID or wait for the lease to expire'
        )
      }

      const observedClient = {
        ...client,
        async report(
          key,
          patch
        ) {
          const result =
            await client.report(
              key,
              patch
            )
          stageTimeline.push({
            at:
              new Date().toISOString(),
            stage:
              patch.stage
          })
          return result
        }
      }

      const result =
        await runClaimedCourseTask({
          client:
            observedClient,
          adapter,
          task:
            claimed.task,
          workerId,
          leaseSeconds: 1800,
          heartbeatEveryMs:
            60_000,
          log: message =>
            console.log(`· ${message}`)
        })
      finalTask = result.task

      if (
        finalTask.stage ===
        'awaiting_llm_window'
      ) {
        cleanup =
          verifyRegressionCleanup(
            scratchRoot,
            finalTask
          )
        if (
          !cleanup.mediaDeleted ||
          !cleanup.fragmentsDeleted ||
          !cleanup.transcriptRetained ||
          !cleanup.textpackRetained
        ) {
          throw new Error(
            'Downstream cleanup verification failed'
          )
        }
        break
      }

      if (
        finalTask.stage ===
        'needs_attention'
      ) {
        throw new Error(
          finalTask.last_error?.message ||
          'Downstream task needs attention'
        )
      }

      if (
        attempt === maxAttempts
      ) {
        throw new Error(
          `Downstream pipeline stopped at ${finalTask.stage}`
        )
      }

      if (!fs.existsSync(targetMedia)) {
        seedMediaFile(
          sourcePath,
          targetMedia
        )
      }
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
        preflight: {
          mode:
            'local-media-downstream',
          selectedMedia: {
            fileName:
              path.basename(sourcePath),
            durationSeconds:
              seededInfo.durationSeconds,
            bytes:
              seededInfo.bytes
          },
          candidateCount:
            candidates.length
        },
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

  console.log(
    '✓ Local media downstream E2E reached awaiting_llm_window'
  )
}

main().catch(error => {
  if (
    Array.isArray(
      error?.candidates
    )
  ) {
    console.error(
      JSON.stringify({
        error:
          error.message,
        code:
          error.code || '',
        candidates:
          error.candidates
      }, null, 2)
    )
  } else {
    console.error(
      `✗ ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    )
  }
  process.exitCode = 1
})
