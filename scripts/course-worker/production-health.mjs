#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import './worker-env.mjs'
import {
  collectProductionHealth
} from './production-health-core.mjs'

const allowAll =
  process.argv.includes('--all')
const health =
  await collectProductionHealth({
    allowAll
  })

const scratchRoot = path.resolve(
  process.env
    .COURSE_WORKER_SCRATCH_DIR ||
  path.join(
    os.homedir(),
    '.law-tech-course-worker'
  )
)
const outputDir = path.join(
  scratchRoot,
  'health'
)
fs.mkdirSync(outputDir, {
  recursive: true
})
fs.writeFileSync(
  path.join(
    outputDir,
    'latest.json'
  ),
  JSON.stringify(
    health,
    null,
    2
  ) + '\n'
)

console.log(
  JSON.stringify(
    health,
    null,
    2
  )
)
if (!health.ok) {
  process.exitCode = 1
}
