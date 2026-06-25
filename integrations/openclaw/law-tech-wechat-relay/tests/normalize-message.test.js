import assert from 'node:assert/strict'
import test from 'node:test'
import { handleWechatInbound } from '../src/index.js'
import { normalizeOpenClawHookMessage, normalizeWechatMessage, shouldHandleWechatMessage } from '../src/normalize-message.js'

test('normalizes openclaw-weixin text message', () => {
  const message = normalizeWechatMessage({
    channel: 'openclaw-weixin',
    BodyForAgent: '明天晚上七点和师兄吃饭',
    senderId: 'wx-user',
    messageId: 'msg-001',
    threadId: 'thread-001'
  })

  assert.equal(message.command, '明天晚上七点和师兄吃饭')
  assert.equal(message.senderId, 'wx-user')
  assert.equal(message.messageId, 'msg-001')
  assert.equal(shouldHandleWechatMessage(message), true)
})

test('ignores empty messages', () => {
  const message = normalizeWechatMessage({
    channel: 'openclaw-weixin',
    BodyForAgent: '   '
  })

  assert.equal(shouldHandleWechatMessage(message), false)
})

test('claims message and returns Law-Tech reply text', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: true,
    replyText: '已添加日程：和师兄吃饭\n时间：tomorrow 19:00'
  }), { status: 200, headers: { 'content-type': 'application/json' } })

  try {
    const result = await handleWechatInbound({
      channel: 'openclaw-weixin',
      BodyForAgent: '明天晚上七点和师兄吃饭',
      senderId: 'wx-user',
      messageId: 'msg-001'
    }, {
      captureUrl: 'https://law-tech.dev/api/schedule/capture',
      token: 'test-token'
    })

    assert.equal(result.claimed, true)
    assert.equal(result.stopAgent, true)
    assert.match(result.replyText, /已添加日程/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('normalizes OpenClaw message_received hook event', () => {
  const message = normalizeOpenClawHookMessage({
    content: 'https://mp.weixin.qq.com/s/example',
    messageId: 'msg-002',
    metadata: { senderId: 'wx-user' }
  }, {
    channelId: 'openclaw-weixin',
    senderId: 'wx-user',
    conversationId: 'wx-user'
  })

  assert.equal(message.channel, 'openclaw-weixin')
  assert.equal(message.command, 'https://mp.weixin.qq.com/s/example')
  assert.equal(message.senderId, 'wx-user')
})
