import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  buildCourseWorkerEnvironment,
  parseEnvText
} from './worker-env.mjs'

test('parses quoted and exported environment values', () => {
  assert.deepEqual(
    parseEnvText([
      '# comment',
      'export A=one',
      'B="two three"',
      "C='four'",
      'INVALID LINE'
    ].join('\n')),
    {
      A: 'one',
      B: 'two three',
      C: 'four'
    }
  )
})

test('shell values beat local files and dedicated file beats general file', () => {
  const root = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'law-tech-worker-env-'
    )
  )
  fs.writeFileSync(
    path.join(root, '.env.local'),
    'A=general\nB=general\n'
  )
  fs.writeFileSync(
    path.join(
      root,
      '.env.course-worker.local'
    ),
    'A=dedicated\nC=dedicated\n'
  )

  const built =
    buildCourseWorkerEnvironment({
      repoRoot: root,
      homeDir: root,
      baseEnv: {
        PATH: '',
        B: 'shell'
      }
    })

  assert.equal(
    built.env.A,
    'dedicated'
  )
  assert.equal(
    built.env.B,
    'shell'
  )
  assert.equal(
    built.env.C,
    'dedicated'
  )
})

test('detects the previously validated browser profile', () => {
  const root = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'law-tech-worker-profile-'
    )
  )
  const profile = path.join(
    root,
    '.law-tech-course-browser-profile'
  )
  fs.mkdirSync(profile)
  fs.writeFileSync(
    path.join(profile, 'Local State'),
    '{}'
  )

  const built =
    buildCourseWorkerEnvironment({
      repoRoot: root,
      homeDir: root,
      baseEnv: {
        PATH: ''
      }
    })

  assert.equal(
    built.env.COURSE_BROWSER_PROFILE_DIR,
    profile
  )
})
