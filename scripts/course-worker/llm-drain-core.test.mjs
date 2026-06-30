import assert from 'node:assert/strict'
import test from 'node:test'

import {
  drainCourseLlmTasks,
  selectCourseLlmTasks
} from './llm-drain-core.mjs'

test('LLM selection obeys allowlist and excludes media tasks', () => {
  const selected = selectCourseLlmTasks([
    {
      replay_key: '刑法',
      course_name: '刑法分论',
      stage: 'awaiting_llm_window',
      artifacts: { courseJobId: 'job-a' }
    },
    {
      replay_key: '国际法',
      course_name: '国际法学',
      stage: 'awaiting_llm_window',
      artifacts: { courseJobId: 'job-b' }
    },
    {
      replay_key: '下载中',
      course_name: '刑法分论',
      stage: 'downloading',
      artifacts: {}
    }
  ], {
    allowlist: ['刑法分论'],
    maximum: 4
  })
  assert.deepEqual(
    selected.map(item => item.replay_key),
    ['刑法']
  )
})

test('two LLM tasks resume independently and the batch budget is bounded', async () => {
  const states = new Map([
    ['one', ['writing', 'completed']],
    ['two', ['completed']]
  ])
  const calls = []
  const client = {
    async list() {
      return {
        tasks: [
          {
            replay_key: 'one',
            course_name: '刑法分论',
            stage: 'writing',
            first_seen_at: '2026-06-01',
            artifacts: { courseJobId: 'job-one' }
          },
          {
            replay_key: 'two',
            course_name: '刑法分论',
            stage: 'awaiting_llm_window',
            first_seen_at: '2026-06-02',
            artifacts: { courseJobId: 'job-two' }
          }
        ]
      }
    },
    async runLlm(replayKey) {
      calls.push(replayKey)
      const stage = states.get(replayKey).shift()
      return {
        ok: true,
        task: {
          replay_key: replayKey,
          course_name: '刑法分论',
          stage,
          artifacts: { courseJobId: `job-${replayKey}` }
        },
        nextAction: stage === 'completed' ? 'done' : 'run',
        reason: stage === 'completed' ? 'completed' : ''
      }
    },
    async report() {
      throw new Error('report should not be used')
    }
  }

  const result = await drainCourseLlmTasks({
    client,
    allowlist: ['刑法分论'],
    maxTasks: 2,
    maxBatchesPerTask: 3,
    maxBatches: 3,
    sleep: async () => {}
  })

  assert.deepEqual(calls, ['one', 'one', 'two'])
  assert.equal(result.batches, 3)
  assert.deepEqual(
    result.results.map(item => item.task.stage),
    ['completed', 'completed']
  )
})
