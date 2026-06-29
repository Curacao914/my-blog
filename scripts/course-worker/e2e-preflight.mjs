#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'

function commandOk(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    stdio: 'ignore'
  })
  return result.status === 0
}

function findChrome() {
  return [
    process.env.COURSE_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean).find(candidate =>
    fs.existsSync(candidate)
  )
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
    name => !String(process.env[name] || '').trim()
  )

  const profileDir = path.resolve(
    process.env.COURSE_BROWSER_PROFILE_DIR ||
    path.join(
      os.homedir(),
      '.law-tech-course-worker',
      'browser-profile'
    )
  )
  const hasProfile =
    fs.existsSync(profileDir) &&
    fs.readdirSync(profileDir).length > 0
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

export async function runE2ePreflight(
  options = {}
) {
  const environment =
    requiredEnvironment()
  const scratch = scratchCheck()
  const tools = {
    node20:
      Number(process.versions.node.split('.')[0]) >= 20,
    ffmpeg: commandOk('ffmpeg'),
    ffprobe: commandOk('ffprobe'),
    python3: commandOk('python3', ['--version']),
    boto3: commandOk('python3', [
      '-c',
      'import boto3'
    ]),
    chrome: Boolean(findChrome())
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
      controlPlane = {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error)
      }
    }
  }

  const result = {
    ok:
      environment.missing.length === 0 &&
      Object.values(tools).every(Boolean) &&
      scratch.enoughSpace &&
      controlPlane.ok,
    environment: {
      missing: environment.missing,
      hasReusableProfile:
        environment.hasProfile,
      hasCredentials:
        environment.hasCredentials
    },
    tools,
    scratch,
    controlPlane
  }

  if (!options.quiet) {
    console.log(
      JSON.stringify(result, null, 2)
    )
  }
  return result
}

if (
  import.meta.url ===
  `file://${process.argv[1]}`
) {
  runE2ePreflight().then(result => {
    process.exitCode = result.ok ? 0 : 1
  }).catch(error => {
    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    )
    process.exitCode = 1
  })
}
