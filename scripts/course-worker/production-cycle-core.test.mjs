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

  assert.equal(
    summary.status,
    'attention'
  )
  assert.equal(
    cycleExitCode(summary),
    2
  )
})
