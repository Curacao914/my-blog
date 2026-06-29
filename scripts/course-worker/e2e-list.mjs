#!/usr/bin/env node
import process from 'node:process'

import {
  createValidatedAcquisitionRuntime
} from './runtime/acquisition-runtime.mjs'
import {
  flattenRegressionCandidates
} from './e2e-core.mjs'
import {
  runE2ePreflight
} from './e2e-preflight.mjs'

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

async function main() {
  const args = parseArgs(process.argv)
  const preflight = await runE2ePreflight({
    quiet: true
  })
  if (!preflight.ok) {
    console.log(
      JSON.stringify(preflight, null, 2)
    )
    throw new Error(
      'E2E preflight failed'
    )
  }

  const runtime =
    createValidatedAcquisitionRuntime()
  try {
    const discovery = await runtime.discover({
      courseName: args.course || ''
    })
    const candidates =
      flattenRegressionCandidates(discovery)
    console.log(
      JSON.stringify(
        {
          loginMode:
            discovery.loginMode,
          count: candidates.length,
          candidates
        },
        null,
        2
      )
    )
  } finally {
    await runtime.close()
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
