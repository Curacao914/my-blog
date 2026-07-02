import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  parseProbeJson,
  rankMediaCandidates,
  seedMediaFile,
  selectAutomaticMedia,
  validateMediaInfo
} from './local-media-core.mjs'

test('probe JSON is normalized', () => {
  const info = parseProbeJson({
    format: {
      duration: '10774.5',
      size: '1000000'
    },
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264'
      },
      {
        codec_type: 'audio',
        codec_name: 'aac'
      }
    ]
  }, '/tmp/lecture.mp4')

  assert.equal(
    info.durationSeconds,
    10774.5
  )
  assert.equal(info.hasAudio, true)
  assert.equal(info.hasVideo, true)
})

test('media validation requires audio', () => {
  const result = validateMediaInfo({
    durationSeconds: 1000,
    bytes: 100_000_000,
    hasAudio: false
  })
  assert.equal(result.ok, false)
  assert.match(
    result.errors.join(' '),
    /audio/
  )
})

test('candidate ranking favors duration', () => {
  const ranked = rankMediaCandidates([
    {
      filePath: '/b.mp4',
      durationSeconds: 9000,
      mtimeMs: 2
    },
    {
      filePath: '/a.mp4',
      durationSeconds: 10770,
      mtimeMs: 1
    }
  ], {
    expectedDurationSeconds: 10774
  })

  assert.equal(
    ranked[0].filePath,
    '/a.mp4'
  )
})

test('automatic selection accepts one close recording', () => {
  const selected = selectAutomaticMedia([
    {
      filePath: '/close.mp4',
      durationSeconds: 10770
    },
    {
      filePath: '/far.mp4',
      durationSeconds: 7000
    }
  ], {
    expectedDurationSeconds: 10774,
    toleranceSeconds: 1200
  })

  assert.equal(
    selected.filePath,
    '/close.mp4'
  )
})

test('automatic selection refuses ambiguity', () => {
  assert.throws(
    () =>
      selectAutomaticMedia([
        {
          filePath: '/one.mp4',
          durationSeconds: 10770
        },
        {
          filePath: '/two.mp4',
          durationSeconds: 10780
        }
      ], {
        expectedDurationSeconds: 10774,
        toleranceSeconds: 1200
      }),
    error =>
      error.code ===
      'MEDIA_AMBIGUOUS'
  )
})

test('seeding uses a link or copy and preserves source', () => {
  const root = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'course-media-seed-'
    )
  )
  const source = path.join(
    root,
    'source.mp4'
  )
  const target = path.join(
    root,
    'nested',
    'media.mp4'
  )
  fs.writeFileSync(
    source,
    'course-media'
  )

  const result =
    seedMediaFile(
      source,
      target
    )

  assert.match(
    result.mode,
    /hardlink|copy/
  )
  assert.equal(
    fs.readFileSync(target, 'utf8'),
    'course-media'
  )
  assert.equal(
    fs.readFileSync(source, 'utf8'),
    'course-media'
  )
})
