#!/usr/bin/env node
import process from 'node:process'

import './worker-env.mjs'
import {
  discoverAndProbeMedia,
  selectAutomaticMedia
} from './local-media-core.mjs'

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
    if (!value.startsWith('--')) {
      continue
    }
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

const args = parseArgs(process.argv)
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
      Number(args['recent-days'] || 60),
    maximumFiles:
      Number(args.limit || 40)
  })

let recommended = null
let selectionError = null
try {
  recommended =
    selectAutomaticMedia(
      candidates,
      {
        expectedDurationSeconds,
        toleranceSeconds
      }
    )
} catch (error) {
  selectionError = {
    code: error.code || '',
    message:
      error instanceof Error
        ? error.message
        : String(error)
  }
}

console.log(
  JSON.stringify({
    ok: true,
    expectedDurationSeconds,
    toleranceSeconds,
    recommended,
    selectionError,
    candidates:
      candidates.slice(0, 20)
  }, null, 2)
)
