import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/outbound-poller.js'),
  'utf8'
)

test('uses the public domain and avoids duplicate object links', () => {
  assert.match(source, /LAW_TECH_PUBLIC_URL/)
  assert.match(source, /https:\/\/law-tech\.dev/)
  assert.match(source, /bodyAlreadyContainsTarget/)
  assert.match(source, /buildDeliveryMessage/)
})

test('appends Markdown links rather than a second raw URL', () => {
  assert.match(source, /\[\$\{deliveryLinkLabel\(delivery\)\}\]/)
  assert.doesNotMatch(
    source,
    /`\n\$\{String\(delivery\.object_url\)/
  )
})
