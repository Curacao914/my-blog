import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/outbound-poller.js'),
  'utf8'
)

test('prepares, claims, sends through openclaw-weixin and acknowledges', () => {
  assert.match(source, /\/api\/messages\/outbound\/prepare/)
  assert.match(source, /\/api\/messages\/outbound\/claim/)
  assert.match(source, /openclaw-weixin/)
  assert.match(source, /\/ack/)
  assert.match(source, /--dry-run/)
})

test('never invokes an agent or model', () => {
  assert.doesNotMatch(source, /agent run/)
  assert.doesNotMatch(source, /chat\/completions/)
})
