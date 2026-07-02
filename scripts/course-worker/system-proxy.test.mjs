import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseScutilProxy,
  shellExports
} from './system-proxy.mjs'

test('prefers the enabled macOS HTTPS proxy', () => {
  const proxy = parseScutilProxy(`
<dictionary> {
  HTTPEnable : 1
  HTTPPort : 7890
  HTTPProxy : 127.0.0.1
  HTTPSEnable : 1
  HTTPSPort : 7891
  HTTPSProxy : 127.0.0.1
}
  `)
  assert.deepEqual(proxy, {
    detected: true,
    source: 'macOS HTTPS',
    host: '127.0.0.1',
    port: 7891,
    url: 'http://127.0.0.1:7891'
  })
})

test('falls back to the enabled HTTP proxy', () => {
  const proxy = parseScutilProxy(`
<dictionary> {
  HTTPEnable : 1
  HTTPPort : 8080
  HTTPProxy : localhost
  HTTPSEnable : 0
}
  `)
  assert.equal(proxy.detected, true)
  assert.equal(proxy.source, 'macOS HTTP')
  assert.equal(proxy.url, 'http://localhost:8080')
})

test('returns no proxy when system proxy is disabled', () => {
  assert.deepEqual(
    parseScutilProxy(`
<dictionary> {
  HTTPEnable : 0
  HTTPSEnable : 0
}
    `),
    {
      detected: false,
      source: '',
      host: '',
      port: 0,
      url: ''
    }
  )
})

test('produces startup proxy exports', () => {
  const text = shellExports({
    detected: true,
    url: 'http://127.0.0.1:7890'
  })
  assert.match(text, /HTTPS_PROXY/)
  assert.match(text, /NODE_USE_ENV_PROXY=1/)
  assert.equal(text.includes('password'), false)
})
