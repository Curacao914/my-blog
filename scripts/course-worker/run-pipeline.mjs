#!/usr/bin/env node
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import {
  createUnconfiguredCoursePipelineAdapter,
  validateCoursePipelineAdapter
} from './pipeline-adapter-contract.mjs'
import {
  runCoursePipelineLoop
} from './pipeline-runner-core.mjs'
import {
  createCoursePipelineWorkerClient
} from './pipeline-worker-client.mjs'

function parseArgs(argv) {
  const result = {}
  for (let index = 2; index < argv.length; index += 1) {
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

async function loadAdapter(modulePath) {
  if (!modulePath) {
    return createUnconfiguredCoursePipelineAdapter()
  }

  const absolute = path.isAbsolute(modulePath)
    ? modulePath
    : path.resolve(process.cwd(), modulePath)
  const loaded = await import(
    pathToFileURL(absolute).href
  )
  return validateCoursePipelineAdapter(
    loaded.default || loaded.adapter || loaded
  )
}

async function main() {
  const args = parseArgs(process.argv)
  const workerId = String(
    args['worker-id'] ||
      process.env.COURSE_WORKER_ID ||
      `${os.hostname()}:${process.pid}`
  ).replace(/[^A-Za-z0-9._:-]/g, '_')
  const leaseSeconds = Math.max(
    60,
    Number(
      args['lease-seconds'] ||
        process.env.COURSE_PIPELINE_LEASE_SECONDS ||
        900
    )
  )
  const maxTasks = Math.max(
    1,
    Number(args['max-tasks'] || 20)
  )

  const client =
    createCoursePipelineWorkerClient()
  const adapter = await loadAdapter(
    args.adapter ||
      process.env.COURSE_PIPELINE_ADAPTER_MODULE
  )

  console.log(`Worker: ${workerId}`)
  console.log(`Lease: ${leaseSeconds}s`)
  console.log(`Max tasks: ${maxTasks}`)

  const result = await runCoursePipelineLoop({
    client,
    adapter,
    workerId,
    leaseSeconds,
    maxTasks,
    log: message => console.log(`· ${message}`)
  })

  console.log(
    result.idle
      ? `✓ Queue idle after ${result.processed} task(s).`
      : `✓ Processed ${result.processed} task(s).`
  )

  const attention = result.results.filter(
    item =>
      item.status === 'needs_attention' ||
      item.status === 'failed'
  )
  if (attention.length) {
    console.log(
      `⚠ ${attention.length} task(s) require retry or attention.`
    )
  }
}

main().catch(error => {
  console.error(
    `✗ ${
      error instanceof Error
        ? error.message
        : String(error)
    }`
  )
  process.exitCode = 1
})
