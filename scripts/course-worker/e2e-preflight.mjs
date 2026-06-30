#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  COURSE_WORKER_REPO_ROOT,
  findWorkerExecutable,
  loadCourseWorkerEnvironment
} from './worker-env.mjs'

function commandResult(
  command,
  args = ['--version']
) {
  if (!command) {
    return {
      ok: false,
      path: ''
    }
  }
  const result = spawnSync(
    command,
    args,
    {
      stdio: 'ignore',
      env: process.env
    }
  )
  return {
    ok: result.status === 0,
    path: command
  }
}

function requiredEnvironment() {
  const required = [
    'COURSE_CONTROL_PLANE_URL',
    'COURSE_WORKER_SECRET',
    'DASHSCOPE_API_KEY',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET'
  ]
  const missing = required.filter(
    name =>
      !String(
        process.env[name] || ''
      ).trim()
  )

  const profileDir = path.resolve(
    process.env.COURSE_BROWSER_PROFILE_DIR ||
      path.join(
        os.homedir(),
        '.law-tech-course-worker',
        'browser-profile'
      )
  )
  const hasProfile = (() => {
    try {
      return (
        fs.statSync(profileDir).isDirectory() &&
        fs.readdirSync(profileDir).length > 0
      )
    } catch {
      return false
    }
  })()
  const hasCredentials =
    Boolean(process.env.PKU_USERNAME) &&
    Boolean(process.env.PKU_PASSWORD)

  if (!hasProfile && !hasCredentials) {
    missing.push(
      'PKU_USERNAME/PKU_PASSWORD or a reusable COURSE_BROWSER_PROFILE_DIR'
    )
  }

  return {
    missing,
    profileDir,
    hasProfile,
    hasCredentials
  }
}

function scratchCheck() {
  const scratchRoot = path.resolve(
    process.env.COURSE_WORKER_SCRATCH_DIR ||
      path.join(
        os.homedir(),
        '.law-tech-course-worker'
      )
  )
  fs.mkdirSync(scratchRoot, {
    recursive: true
  })
  const marker = path.join(
    scratchRoot,
    `.write-test-${process.pid}`
  )
  fs.writeFileSync(marker, 'ok')
  fs.rmSync(marker)

  const stat = fs.statfsSync(scratchRoot)
  const freeBytes =
    Number(stat.bavail) *
    Number(stat.bsize)
  const minimum = Number(
    process.env.COURSE_E2E_MIN_FREE_BYTES ||
      5 * 1024 * 1024 * 1024
  )

  return {
    scratchRoot,
    freeBytes,
    minimum,
    enoughSpace: freeBytes >= minimum
  }
}

function nextActions(
  environment,
  tools,
  controlPlane
) {
  const actions = []
  const configPath = path.join(
    COURSE_WORKER_REPO_ROOT,
    '.env.course-worker.local'
  )

  if (environment.missing.length) {
    actions.push(
      `填写本机私密配置：${configPath}`
    )
  }
  if (!tools.ffmpeg.ok || !tools.ffprobe.ok) {
    actions.push(
      '运行 yarn course:pipeline:e2e-prepare 安装 ffmpeg'
    )
  }
  if (!tools.boto3.ok) {
    actions.push(
      '运行 yarn course:pipeline:e2e-prepare 创建 Python 环境并安装 boto3'
    )
  }
  if (!controlPlane.ok) {
    actions.push(
      '确认 Preview URL、COURSE_WORKER_SECRET 和 Preview 部署均为最新版本'
    )
  }
  return [...new Set(actions)]
}

export async function runE2ePreflight(
  options = {}
) {
  const loaded =
    loadCourseWorkerEnvironment()
  const environment =
    requiredEnvironment()
  const scratch = scratchCheck()

  const ffmpegPath =
    findWorkerExecutable('ffmpeg')
  const ffprobePath =
    findWorkerExecutable('ffprobe')
  const pythonPath =
    process.env.COURSE_PYTHON ||
    findWorkerExecutable(
      'python3',
      {
        candidates: [
          path.join(
            COURSE_WORKER_REPO_ROOT,
            '.venv-course-worker',
            'bin',
            'python'
          )
        ]
      }
    )
  const chromePath =
    process.env.COURSE_CHROME_PATH || ''

  const tools = {
    node20: {
      ok:
        Number(
          process.versions.node.split('.')[0]
        ) >= 20,
      version: process.versions.node
    },
    ffmpeg:
      commandResult(
        ffmpegPath,
        ['-version']
      ),
    ffprobe:
      commandResult(
        ffprobePath,
        ['-version']
      ),
    python3:
      commandResult(
        pythonPath,
        ['--version']
      ),
    boto3:
      commandResult(
        pythonPath,
        ['-c', 'import boto3']
      ),
    chrome: {
      ok: Boolean(
        chromePath &&
        fs.existsSync(chromePath)
      ),
      path: chromePath
    }
  }

  let controlPlane = {
    ok: false,
    error: ''
  }
  if (
    !environment.missing.includes(
      'COURSE_CONTROL_PLANE_URL'
    ) &&
    !environment.missing.includes(
      'COURSE_WORKER_SECRET'
    )
  ) {
    try {
      const {
        createCoursePipelineWorkerClient
      } = await import(
        './pipeline-worker-client.mjs'
      )
      const client =
        createCoursePipelineWorkerClient()
      const result = await client.list({
        limit: 1
      })
      controlPlane = {
        ok: true,
        taskCount:
          result.summary?.total ?? null
      }
    } catch (error) {
      const cause =
        error && typeof error === 'object'
          ? error.cause
          : null
      controlPlane = {
        ok: false,
        error: [
          error instanceof Error
            ? error.message
            : String(error),
          cause && typeof cause === 'object'
            ? cause.code
            : '',
          cause && typeof cause === 'object'
            ? cause.message
            : ''
        ].filter(Boolean).join(' | ')
      }
    }
  }

  const toolsOk =
    Object.values(tools).every(
      item => item.ok
    )
  const result = {
    ok:
      environment.missing.length === 0 &&
      toolsOk &&
      scratch.enoughSpace &&
      controlPlane.ok,
    environment: {
      configFile: path.join(
        COURSE_WORKER_REPO_ROOT,
        '.env.course-worker.local'
      ),
      loadedFiles:
        loaded.loadedFiles.map(
          filePath =>
            path.relative(
              COURSE_WORKER_REPO_ROOT,
              filePath
            ) || path.basename(filePath)
        ),
      missing: environment.missing,
      hasReusableProfile:
        environment.hasProfile,
      browserProfile:
        environment.profileDir,
      hasCredentials:
        environment.hasCredentials
    },
    tools,
    scratch,
    controlPlane
  }
  result.nextActions = nextActions(
    environment,
    tools,
    controlPlane
  )

  if (!options.quiet) {
    console.log(
      JSON.stringify(result, null, 2)
    )
    if (
      !result.ok &&
      result.nextActions.length
    ) {
      console.log('\n下一步：')
      result.nextActions.forEach(
        (action, index) =>
          console.log(
            `${index + 1}. ${action}`
          )
      )
    }
  }
  return result
}

const directPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : ''
const modulePath =
  fileURLToPath(import.meta.url)

if (directPath === modulePath) {
  runE2ePreflight()
    .then(result => {
      process.exitCode =
        result.ok ? 0 : 1
    })
    .catch(error => {
      console.error(
        error instanceof Error
          ? error.message
          : String(error)
      )
      process.exitCode = 1
    })
}
