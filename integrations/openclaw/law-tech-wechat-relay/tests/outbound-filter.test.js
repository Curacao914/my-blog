import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeOpenClawHookMessage,
  normalizeWechatMessage,
  shouldHandleWechatMessage
} from '../src/normalize-message.js'

test('filters explicit outbound or self-authored WeChat messages', () => {
  const outbound = normalizeOpenClawHookMessage(
    {
      content: '未读课程简报已全部读完',
      metadata: { direction: 'outbound' }
    },
    { channelId: 'openclaw-weixin' }
  )
  assert.equal(outbound.direction, 'outbound')
  assert.equal(shouldHandleWechatMessage(outbound), false)

  const selfAuthored = normalizeWechatMessage({
    channel: 'wechat',
    text: '每日提醒',
    isFromMe: true
  })
  assert.equal(selfAuthored.fromSelf, true)
  assert.equal(shouldHandleWechatMessage(selfAuthored), false)
})

test('filters assistant and system messages but keeps inbound user text', () => {
  const assistant = normalizeWechatMessage({
    channel: 'wechat',
    text: '已完成',
    role: 'assistant'
  })
  assert.equal(shouldHandleWechatMessage(assistant), false)

  const inbound = normalizeOpenClawHookMessage(
    { content: '明天下午三点开会', direction: 'inbound' },
    { channelId: 'openclaw-weixin', senderId: 'user-1' }
  )
  assert.equal(inbound.direction, 'inbound')
  assert.equal(shouldHandleWechatMessage(inbound), true)
})
