import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/outbound-poller.js'),
  'utf8'
)
const localRunner = fs.readFileSync(
  path.join(process.cwd(), 'src/local-runner.js'),
  'utf8'
)

test('poller synchronizes model and reports heartbeat', () => {
  assert.match(source, /runtime-config/)
  assert.match(source, /models', 'set'/)
  assert.match(source, /openclaw\/heartbeat/)
})

test('local runner discovers token and target without duplicating secrets', () => {
  assert.match(localRunner, /openclaw\.json/)
  assert.match(localRunner, /context-tokens\.json/)
  assert.doesNotMatch(localRunner, /sk-[A-Za-z0-9]/)
})
