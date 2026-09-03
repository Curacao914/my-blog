import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { sendReminderEmail } from '@/lib/server/email'
import { getReminderPreferences } from '@/lib/server/supabase'
import { resolveUserEmailConfig } from '@/lib/server/userIntegrations'

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  const auth = await requireWorkspaceRequest(req, { permission: 'reminders' })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  try {
    const preference = await getReminderPreferences(auth.profile.id)
    const requestedEmail = String(req.body?.email || '').trim()
    const to = requestedEmail || preference?.email || auth.profile.email || ''
    if (!validEmail(to)) return res.status(400).json({ ok: false, error: '请先填写有效的接收邮箱' })
    const config = await resolveUserEmailConfig(auth.profile)
    if (!config.apiKey || !config.from) {
      return res.status(400).json({ ok: false, error: '请先在“邮件服务”中配置自己的 Resend API Key 和发件人' })
    }
    const result = await sendReminderEmail({
      to,
      subject: 'law-tech 邮件提醒测试',
      text: '邮件提醒已经接通。\n\n看到我记得喝口水。',
      html: '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;background:#f7f6f1;padding:28px"><div style="max-width:560px;margin:auto;border-radius:22px;padding:26px;background:#fff"><h1 style="font-family:Georgia,Songti SC,serif;color:#183f32">邮件提醒已经接通</h1><p style="color:#69756f;line-height:1.8">以后每日安排与到期事项会从这里抵达。</p><p style="color:#183f32">看到我记得喝口水。</p></div></div>',
      config
    })
    return res.status(200).json({ ok: true, id: result?.id || null })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Test email failed'
    })
  }
}
