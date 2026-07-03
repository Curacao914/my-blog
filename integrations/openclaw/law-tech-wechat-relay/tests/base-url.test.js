import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeLawTechBaseUrl } from '../src/base-url.js'

test('normalizes supported Law-Tech capture endpoints', () => {
  const cases = [
    [
      'https://law-tech.dev/api/schedule/capture',
      'https://law-tech.dev'
    ],
    [
      'https://law-tech.dev/api/schedule/capture/',
      'https://law-tech.dev'
    ],
    [
      'https://law-tech.dev/api/integrations/openclaw/command',
      'https://law-tech.dev'
    ],
    [
      'https://law-tech.dev/api/integrations/openclaw/command/',
      'https://law-tech.dev'
    ],
    [
      'https://preview.law-tech.dev/api/integrations/openclaw/command',
      'https://preview.law-tech.dev'
    ],
    [
      'https://example.com/prefix/api/integrations/openclaw/command',
      'https://example.com/prefix'
    ]
  ]

  for (const [input, expected] of cases) {
    assert.equal(normalizeLawTechBaseUrl(input), expected)
  }
})

test('keeps an existing base URL stable', () => {
  assert.equal(
    normalizeLawTechBaseUrl('https://law-tech.dev'),
    'https://law-tech.dev'
  )
  assert.equal(
    normalizeLawTechBaseUrl(' https://law-tech.dev/ '),
    'https://law-tech.dev'
  )
})

test('does not strip unrelated API paths', () => {
  assert.equal(
    normalizeLawTechBaseUrl(
      'https://law-tech.dev/api/integrations/openclaw/heartbeat'
    ),
    'https://law-tech.dev/api/integrations/openclaw/heartbeat'
  )
})

test('removes query and hash values from configured endpoints', () => {
  assert.equal(
    normalizeLawTechBaseUrl(
      'https://law-tech.dev/api/integrations/openclaw/command?x=1#section'
    ),
    'https://law-tech.dev'
  )
})

test('handles empty and non-URL fallback values', () => {
  assert.equal(normalizeLawTechBaseUrl(''), '')
  assert.equal(
    normalizeLawTechBaseUrl(
      'internal/api/integrations/openclaw/command'
    ),
    'internal'
  )
})
