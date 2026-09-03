import assert from 'node:assert/strict'
import test from 'node:test'
import { handleWechatInbound } from '../src/index.js'

test('claims a non-actionable message without producing reply text', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => new Response(JSON.stringify({
    ok: true,
    status: 'ignored',
    action: 'ignored',
    reason: 'not_actionable',
    silent: true,
    replyText: '未识别到需要处理的命令。'
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })

  try {
    const result = await handleWechatInbound({
      channel: 'openclaw-weixin',
      BodyForAgent: '你好',
      senderId: 'wx-user',
      messageId: 'msg-silent'
    }, {
      captureUrl: 'https://law-tech.dev/api/integrations/openclaw/command',
      token: 'test-token'
    })

    assert.equal(result.claimed, true)
    assert.equal(result.stopAgent, true)
    assert.equal(result.silent, true)
    assert.equal(result.replyText, '')
  } finally {
    globalThis.fetch = originalFetch
  }
})
