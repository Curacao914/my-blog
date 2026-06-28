import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import {
  deleteUserIntegration,
  getUserIntegration,
  publicIntegration,
  resolveUserEmailConfig,
  upsertUserIntegration
} from '@/lib/server/userIntegrations'

function validFrom(value) {
  const text = String(value || '').trim()
  return text && /<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(text)
}

export default async function handler(req, res) {
  const auth = await requireWorkspaceRequest(req, { permission: 'reminders' })
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error, code: auth.code })

  try {
    if (req.method === 'GET') {
      const record = await getUserIntegration(auth.profile.id, 'resend')
      const effective = await resolveUserEmailConfig(auth.profile)
      return res.status(200).json({
        ok: true,
        integration: publicIntegration(record),
        effective: { configured: Boolean(effective.apiKey && effective.from), source: effective.source }
      })
    }

    if (req.method === 'PATCH') {
      const from = String(req.body?.from || '').trim()
      if (from && !validFrom(from)) {
        return res.status(400).json({ ok: false, error: '发件人格式应为 Name <mail@example.com>' })
      }
      const record = await upsertUserIntegration(auth.profile.id, 'resend', {
        enabled: req.body?.enabled !== false,
        secret: req.body?.apiKey,
        clearSecret: Boolean(req.body?.clearApiKey),
        config: { from }
      })
      return res.status(200).json({ ok: true, integration: publicIntegration(record) })
    }

    if (req.method === 'DELETE') {
      await deleteUserIntegration(auth.profile.id, 'resend')
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Email settings failed' })
  }
}
