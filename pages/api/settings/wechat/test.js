import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  enqueueMessageDelivery,
  getMessageDeliveryForOwner,
  prunePendingWechatTests
} from '@/lib/server/messageDeliveries'

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'reminders' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  if (req.method === 'GET') {
    const id = String(req.query?.id || '').trim()
    if (!id) return res.status(400).json({ ok: false, error: 'Missing delivery id' })
    try {
      const delivery = await getMessageDeliveryForOwner(id, auth.profile.id)
      if (!delivery) return res.status(404).json({ ok: false, error: 'Delivery not found' })
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({ ok: true, delivery })
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : '读取测试状态失败'
      })
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    await prunePendingWechatTests(auth.profile.id)
    const now = new Date()
    const result = await enqueueMessageDelivery({
      ownerId: auth.profile.id,
      purpose: 'wechat-test',
      dedupeKey: `wechat-test:${now.toISOString()}`,
      subject: '微信通道测试',
      bodyText: [
        'law-tech.dev 微信通道测试',
        '',
        '看到这条消息，说明站内队列、OpenClaw Relay 和微信发送链路已经接通。',
        '',
        '这条测试不会调用大模型。'
      ].join('\n'),
      scheduledFor: now.toISOString(),
      metadata: { source: 'settings-test' }
    })
    return res.status(200).json({
      ok: true,
      queued: Boolean(result.row),
      deliveryId: result.row?.id || null,
      status: result.row?.status || 'pending'
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : ''
    const migrationRequired =
      detail.includes('message_deliveries') ||
      detail.includes('schema cache') ||
      detail.includes('PGRST')
    return res.status(migrationRequired ? 409 : 500).json({
      ok: false,
      code: migrationRequired
        ? 'database_upgrade_required'
        : 'wechat_test_failed',
      error: migrationRequired
        ? '微信发送队列尚未初始化，请先完成数据库升级。'
        : detail || '测试消息入队失败'
    })
  }
}
