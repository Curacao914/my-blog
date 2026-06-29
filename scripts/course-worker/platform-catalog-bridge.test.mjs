import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertCatalogBridgeSafe,
  collectPipelineReplays
} from './platform-catalog-bridge.mjs'

const catalog = {
  courses: [
    {
      courseKey: 'course-a',
      name: '国际法学',
      recordings: [
        {
          replayKey: 'replay-new',
          title: '第5-6节',
          startsAtText: '2026-06-03 13:00',
          teacher: '教师甲',
          isNew: true,
          watchHref: 'https://forbidden.example/watch'
        },
        {
          replayKey: 'replay-old',
          title: '第3-4节',
          isNew: false
        }
      ]
    },
    {
      courseKey: 'course-b',
      name: '经济法学',
      recordings: [
        {
          replayKey: 'replay-b',
          title: '第9-10节',
          isNew: true
        }
      ]
    }
  ]
}

test('selects every new replay across all courses', () => {
  const replays = collectPipelineReplays(catalog)
  assert.deepEqual(
    replays.map(item => item.replayKey),
    ['replay-new', 'replay-b']
  )
  assert.equal(
    Object.hasOwn(replays[0], 'watchHref'),
    false
  )
  assert.equal(assertCatalogBridgeSafe(replays), true)
})

test('all mode supports baseline and explicit smoke runs', () => {
  const replays = collectPipelineReplays(catalog, {
    includeAll: true
  })
  assert.deepEqual(
    replays.map(item => item.replayKey),
    ['replay-new', 'replay-old', 'replay-b']
  )
})

test('deduplicates stable replay keys', () => {
  const duplicated = {
    courses: [
      catalog.courses[0],
      catalog.courses[0]
    ]
  }
  const replays = collectPipelineReplays(
    duplicated,
    { includeAll: true }
  )
  assert.equal(replays.length, 2)
})
