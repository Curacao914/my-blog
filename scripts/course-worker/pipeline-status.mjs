#!/usr/bin/env node
import process from 'node:process'

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
  const client = createCoursePipelineClient()
  const result = await client.list({
    stage: args.stage || '',
    limit: Number(args.limit || 100)
  })

  console.log(
    JSON.stringify(
      {
        summary: result.summary || {},
        tasks: (result.tasks || []).map(task => ({
          replayKey: task.replay_key,
          courseName: task.course_name,
          title: task.title,
          stage: task.stage,
          nextAttemptAt: task.next_attempt_at,
          updatedAt: task.updated_at
        }))
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(
    `✗ ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
})
