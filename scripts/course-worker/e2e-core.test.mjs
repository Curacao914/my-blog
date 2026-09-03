import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  buildRegressionReport,
  flattenRegressionCandidates,
  selectRegressionCandidate,
  verifyRegressionCleanup
} from './e2e-core.mjs'

const discovery = {
  courses: [{
    courseKey: 'course-1',
    courseName: '国际法学',
    recordings: [{
      replayKey: 'replay-1',
      title: '2026-06-03第5-6节',
      startsAtText: '2026-06-03',
      teacher: '教师'
    }]
  }]
}

test('flattens and selects one exact replay', () => {
  const candidates =
    flattenRegressionCandidates(discovery)
  assert.equal(candidates.length, 1)
  assert.equal(
    selectRegressionCandidate(
      candidates,
      {
        courseName: '国际法',
        title: '06-03'
      }
    ).replayKey,
    'replay-1'
  )
})

test('rejects an ambiguous selector', () => {
  const candidates = [
    ...flattenRegressionCandidates(discovery),
    {
      ...flattenRegressionCandidates(discovery)[0],
      replayKey: 'replay-2'
    }
  ]
  assert.throws(
    () =>
      selectRegressionCandidate(
        candidates,
        {
          courseName: '国际法'
        }
      ),
    /both --course and --title|matched/
  )
})

test('verifies media deletion and retained text', () => {
  const scratch = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'law-tech-e2e-'
    )
  )
  const root = path.join(
    scratch,
    'replays',
    'replay-1'
  )
  fs.mkdirSync(
    path.join(root, 'transcript'),
    { recursive: true }
  )
  fs.mkdirSync(
    path.join(root, 'textpack'),
    { recursive: true }
  )
  fs.writeFileSync(
    path.join(
      root,
      'transcript',
      'raw-transcript.md'
    ),
    'text'
  )
  fs.writeFileSync(
    path.join(
      root,
      'textpack',
      'course-textpack.json'
    ),
    '{}'
  )

  assert.deepEqual(
    verifyRegressionCleanup(
      scratch,
      {
        replay_key: 'replay-1'
      }
    ),
    {
      mediaDeleted: true,
      fragmentsDeleted: true,
      transcriptRetained: true,
      textpackRetained: true
    }
  )
})

test('redacts URLs and secret-shaped keys from reports', () => {
  const report =
    buildRegressionReport({
      finalTask: {
        stage:
          'awaiting_llm_window',
        watchHref:
          'https://forbidden.example',
        artifacts: {
          accessToken: 'secret'
        }
      },
      cleanup: {
        mediaDeleted: true,
        fragmentsDeleted: true
      }
    })

  const serialized =
    JSON.stringify(report)
  assert.equal(
    serialized.includes(
      'forbidden.example'
    ),
    false
  )
  assert.equal(
    serialized.includes(
      'accessToken'
    ),
    false
  )
  assert.equal(report.success, true)
})
