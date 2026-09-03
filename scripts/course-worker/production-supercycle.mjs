#!/usr/bin/env node
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import './worker-env.mjs'

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))

function run(label, script, args = []) {
  return new Promise(resolve => {
    console.log(`\n== ${label} ==`)
    const child = spawn(
      process.execPath,
      [path.join(MODULE_DIR, script), ...args],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit'
      }
    )
    child.once('error', error => {
      console.error(`✗ ${label}: ${error.message}`)
      resolve(1)
    })
    child.once('exit', code => resolve(Number(code || 0)))
  })
}

async function main() {
  const args = process.argv.slice(2)
  const codes = []

  codes.push(await run(
    'Drain existing LLM work',
    'llm-drain.mjs',
    args
  ))

  if (process.env.COURSE_SUPERCYCLE_SKIP_MEDIA !== '1') {
    codes.push(await run(
      'Discover and preprocess course media',
      'production-cycle.mjs',
      args
    ))
  }

  codes.push(await run(
    'Drain newly imported LLM work',
    'llm-drain.mjs',
    args
  ))

  process.exitCode = codes.includes(2)
    ? 2
    : codes.some(code => code !== 0)
      ? 1
      : 0
}

main().catch(error => {
  console.error(
    `✗ ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
})
