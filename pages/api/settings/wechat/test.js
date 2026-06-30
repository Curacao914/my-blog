import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { enqueueMessageDelivery } from '@/lib/server/messageDeliveries'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const auth = await requireWorkspaceRequest(req, { permission: 'reminders' })
  if (!auth.ok) {
    return res.status(auth.status).json({
      ok: false,
      error: auth.error,
      code: auth.code
    })
  }

  try {
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
      deliveryId: result.row?.id || null
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
