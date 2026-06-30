import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCycleSummary,
  collectAllowedReplays,
  cycleExitCode,
  parseAllowlist,
  selectActionableTasks
} from './production-cycle-core.mjs'

test('allowlist accepts comma and newline delimiters', () => {
  assert.deepEqual(
    parseAllowlist(
      '国际法学,刑法分论\n国际法学'
    ),
    ['国际法学', '刑法分论']
  )
})

test('discovery is filtered by allowlist and recency', () => {
  const result = collectAllowedReplays({
    courses: [
      {
        courseKey: 'course-a',
        courseName: '刑法分论',
        recordings: [
          {
            replayKey: 'recent',
            title: 'recent',
            startsAtText:
              '2026-06-10 18:40:00'
          },
          {
            replayKey: 'old',
            title: 'old',
            startsAtText:
              '2025-01-01 08:00:00'
          }
        ]
      },
      {
        courseKey: 'course-b',
        courseName: '国际法学',
        recordings: [
          {
            replayKey: 'other',
            title: 'other',
            startsAtText:
              '2026-06-11 08:00:00'
          }
        ]
      }
    ]
  }, {
    allowlist: ['刑法分论'],
    sinceDays: 35,
    nowMs:
      Date.parse(
        '2026-06-30T12:00:00+08:00'
      )
  })

  assert.deepEqual(
    result.map(item => item.replayKey),
    ['recent']
  )
})

test('empty allowlist is rejected by default', () => {
  assert.throws(
    () =>
      collectAllowedReplays(
        { courses: [] },
        {}
      ),
    /ALLOWLIST/
  )
})

test('actionable queue selection obeys course boundary', () => {
  const selected =
    selectActionableTasks([
      {
        replay_key: 'one',
        course_name: '刑法分论',
        stage: 'queued',
        starts_at_text:
          '2026-06-10 18:40:00'
      },
      {
        replay_key: 'two',
        course_name: '国际法学',
        stage: 'queued',
        starts_at_text:
          '2026-06-03 13:00:00'
      },
      {
        replay_key: 'done',
        course_name: '刑法分论',
        stage:
          'awaiting_llm_window'
      }
    ], {
      allowlist: ['刑法分论'],
      maximum: 4
    })

  assert.deepEqual(
    selected.map(
      item => item.replay_key
    ),
    ['one']
  )
})

test('summary marks attention and exit code', () => {
  const summary = buildCycleSummary({
    results: [
      {
        task: {
          replay_key: 'one',
          stage:
            'awaiting_llm_window'
        }
      },
      {
        task: {
          replay_key: 'two',
          stage:
            'needs_attention'
        }
      }
    ]
  })

  assert.equal(summary.counts.awaitingLlm, 1)
  assert.equal(
    summary.status,
    'attention'
  )
  assert.equal(
    cycleExitCode(summary),
    2
  )
})

test('media selection rotates across courses and skips future retries', () => {
  const selected = selectActionableTasks([
    {
      replay_key: 'a-wait',
      course_key: 'course-a',
      course_name: '课程甲',
      stage: 'queued',
      starts_at_text: '2026-06-01 08:00:00',
      next_attempt_at: '2026-07-01T00:00:00.000Z'
    },
    {
      replay_key: 'a-one',
      course_key: 'course-a',
      course_name: '课程甲',
      stage: 'queued',
      starts_at_text: '2026-06-02 08:00:00'
    },
    {
      replay_key: 'a-two',
      course_key: 'course-a',
      course_name: '课程甲',
      stage: 'queued',
      starts_at_text: '2026-06-03 08:00:00'
    },
    {
      replay_key: 'b-one',
      course_key: 'course-b',
      course_name: '课程乙',
      stage: 'queued',
      starts_at_text: '2026-06-04 08:00:00'
    }
  ], {
    allowAll: true,
    maximum: 2,
    nowMs: Date.parse('2026-06-30T00:00:00.000Z')
  })

  assert.deepEqual(
    selected.map(item => item.replay_key),
    ['a-one', 'b-one']
  )
})
