import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  spawnSync
} from 'node:child_process'

import {
  findWorkerExecutable
} from './worker-env.mjs'
import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'
import {
  parseAllowlist
} from './production-cycle-core.mjs'

function commandOk(command, args) {
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

function freeBytes(directory) {
  try {
    fs.mkdirSync(directory, {
      recursive: true
    })
    const stat = fs.statfsSync(directory)
    return Number(stat.bavail) *
      Number(stat.bsize)
  } catch {
    return 0
  }
}

export async function collectProductionHealth(
  options = {}
) {
  const scratchRoot = path.resolve(
    process.env
      .COURSE_WORKER_SCRATCH_DIR ||
    path.join(
      os.homedir(),
      '.law-tech-course-worker'
    )
  )
  const profileDir = path.resolve(
    process.env
      .COURSE_BROWSER_PROFILE_DIR ||
    path.join(
      scratchRoot,
      'browser-profile'
    )
  )
  const python =
    process.env.COURSE_PYTHON ||
    findWorkerExecutable('python3')
  const chrome =
    process.env.COURSE_CHROME_PATH ||
    findWorkerExecutable(
      'chromium',
      {
        candidates: [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium'
        ]
      }
    )
  const ffmpeg =
    findWorkerExecutable('ffmpeg')
  const ffprobe =
    findWorkerExecutable('ffprobe')

  const requiredEnvironment = [
    'COURSE_CONTROL_PLANE_URL',
    'COURSE_WORKER_SECRET',
    'DASHSCOPE_API_KEY',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET'
  ]
  const missingEnvironment =
    requiredEnvironment.filter(
      name =>
        !String(
          process.env[name] || ''
        ).trim()
    )

  const allowlist = parseAllowlist(
    options.allowlist ||
    process.env
      .COURSE_PIPELINE_ALLOWLIST
  )
  const hasProfile = (() => {
    try {
      return (
        fs.statSync(
          profileDir
        ).isDirectory() &&
        fs.readdirSync(
          profileDir
        ).length > 0
      )
    } catch {
      return false
    }
  })()
  const hasCredentials = Boolean(
    String(
      process.env.PKU_USERNAME || ''
    ).trim() &&
    String(
      process.env.PKU_PASSWORD || ''
    ).trim()
  )

  const tools = {
    chrome:
      Boolean(chrome) &&
      commandOk(
        chrome,
        ['--version']
      ),
    ffmpeg:
      Boolean(ffmpeg) &&
      commandOk(
        ffmpeg,
        ['-version']
      ),
    ffprobe:
      Boolean(ffprobe) &&
      commandOk(
        ffprobe,
        ['-version']
      ),
    python:
      Boolean(python) &&
      commandOk(
        python,
        ['--version']
      ),
    pythonModules:
      Boolean(python) &&
      commandOk(
        python,
        [
          '-c',
          'import boto3, docx, pptx, pypdf'
        ]
      )
  }

  let controlPlane = {
    ok: false,
    error: ''
  }
  if (
    !missingEnvironment.includes(
      'COURSE_CONTROL_PLANE_URL'
    ) &&
    !missingEnvironment.includes(
      'COURSE_WORKER_SECRET'
    )
  ) {
    try {
      const client =
        createCoursePipelineWorkerClient()
      const listed =
        await client.list({
          limit: 1
        })
      controlPlane = {
        ok: true,
        taskCount:
          listed.summary?.total ??
          listed.tasks?.length ??
          null
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
  }

  const availableBytes =
    freeBytes(scratchRoot)
  const minimumBytes =
    Math.max(
      1024 ** 3,
      Number(
        process.env
          .COURSE_WORKER_MIN_FREE_BYTES ||
        5 * 1024 ** 3
      )
    )

  const checks = {
    environment:
      missingEnvironment.length === 0,
    allowlist:
      options.allowAll === true ||
      allowlist.length > 0,
    authentication:
      hasProfile || hasCredentials,
    tools:
      Object.values(tools)
        .every(Boolean),
    disk:
      availableBytes >= minimumBytes,
    controlPlane:
      controlPlane.ok
  }

  return {
    ok:
      Object.values(checks)
        .every(Boolean),
    checkedAt:
      new Date().toISOString(),
    checks,
    missingEnvironment,
    allowlist,
    authentication: {
      hasReusableProfile: hasProfile,
      hasCredentials
    },
    tools: {
      ...tools,
      chromePath: chrome || '',
      pythonPath: python || '',
      ffmpegPath: ffmpeg || '',
      ffprobePath: ffprobe || ''
    },
    disk: {
      scratchRoot,
      availableBytes,
      minimumBytes
    },
    controlPlane
  }
}
