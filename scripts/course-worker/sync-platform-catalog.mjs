#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import {
  assertCatalogBridgeSafe,
  collectPipelineReplays
} from './platform-catalog-bridge.mjs'
import {
  createCoursePipelineClient
} from './pipeline-client.mjs'

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

async function main() {
  const args = parseArgs(process.argv)
  const catalogPath = path.resolve(
    String(args.catalog || '')
  )
  if (!args.catalog || !fs.existsSync(catalogPath)) {
    throw new Error(
      '--catalog must point to a platform catalog JSON file'
    )
  }

  const catalog = JSON.parse(
    fs.readFileSync(catalogPath, 'utf8')
  )
  const replays = collectPipelineReplays(catalog, {
    includeAll: Boolean(args.all)
  })
  assertCatalogBridgeSafe(replays)

  console.log(
    `→ Catalog: ${path.basename(catalogPath)}`
  )
  console.log(
    `→ Replays selected: ${replays.length}` +
      (args.all ? ' (all)' : ' (new only)')
  )

  if (!replays.length) {
    console.log('✓ No new replay to register.')
    return
  }

  if (args['dry-run']) {
    console.log(
      JSON.stringify(
        {
          count: replays.length,
          replays
        },
        null,
        2
      )
    )
    return
  }

  const client = createCoursePipelineClient()
  const result = await client.discover(replays)

  console.log(
    `✓ Control plane received ${result.received || replays.length}`
  )
  console.log(
    `✓ Newly inserted: ${result.addedCount || 0}`
  )
  if (!client.hasExplicitOwnerId) {
    console.log(
      '✓ Owner resolved by the single-active-owner rule.'
    )
  }
}

main().catch(error => {
  console.error(
    `✗ ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
})
