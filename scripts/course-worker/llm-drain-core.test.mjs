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
      replay_key: '内容待处理',
      course_name: '刑法分论',
      stage: 'needs_attention',
      artifacts: { courseJobId: 'job-content' },
      last_error: {
        kind: 'llm_workflow_attention',
        code: 'waiting-node-human-review'
      }
    },
    {
      replay_key: '登录失败',
      course_name: '刑法分论',
      stage: 'needs_attention',
      artifacts: { courseJobId: 'job-auth' },
      last_error: {
        kind: 'authentication',
        code: 'AUTH_EXPIRED'
      }
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
    ['刑法', '内容待处理']
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

test('LLM selection rotates across courses before taking a second task', () => {
  const selected = selectCourseLlmTasks([
    {
      replay_key: 'a-one',
      course_key: 'course-a',
      course_name: '课程甲',
      stage: 'writing',
      first_seen_at: '2026-06-01',
      artifacts: { courseJobId: 'job-a-one' }
    },
    {
      replay_key: 'a-two',
      course_key: 'course-a',
      course_name: '课程甲',
      stage: 'writing',
      first_seen_at: '2026-06-02',
      artifacts: { courseJobId: 'job-a-two' }
    },
    {
      replay_key: 'b-one',
      course_key: 'course-b',
      course_name: '课程乙',
      stage: 'writing',
      first_seen_at: '2026-06-03',
      artifacts: { courseJobId: 'job-b-one' }
    }
  ], {
    allowAll: true,
    maximum: 2
  })

  assert.deepEqual(
    selected.map(item => item.replay_key),
    ['a-one', 'b-one']
  )
})

test('failed LLM workflow is selected and recovery is requested only once', async () => {
  const calls = []
  const client = {
    async list() {
      return {
        tasks: [
          {
            replay_key: 'recover-me',
            course_name: '国际法学',
            stage: 'needs_attention',
            first_seen_at: '2026-06-01',
            artifacts: { courseJobId: 'job-recover' },
            last_error: {
              kind: 'llm_workflow_attention',
              code: 'failed'
            }
          }
        ]
      }
    },
    async runLlm(replayKey, input) {
      calls.push({ replayKey, ...input })
      const completed = calls.length > 1
      return {
        ok: true,
        task: {
          replay_key: replayKey,
          course_name: '国际法学',
          stage: completed ? 'completed' : 'writing',
          artifacts: { courseJobId: 'job-recover' }
        },
        nextAction: completed ? 'done' : 'run',
        reason: completed ? 'completed' : ''
      }
    },
    async report() {
      throw new Error('report should not be used')
    }
  }

  const result = await drainCourseLlmTasks({
    client,
    allowAll: true,
    maxTasks: 1,
    maxBatchesPerTask: 3,
    maxBatches: 3,
    sleep: async () => {}
  })

  assert.equal(result.results[0].task.stage, 'completed')
  assert.equal(calls[0].recoverFailedWorkflow, true)
  assert.equal(calls[1].recoverFailedWorkflow, false)
})

