import { deleteExpiredOpenClawAgentShadowTraces } from '@/lib/server/openclawAgentShadowTraces'

function authorized(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  return Boolean(process.env.CRON_SECRET && token === process.env.CRON_SECRET)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
  try {
    await deleteExpiredOpenClawAgentShadowTraces()
    return res.status(200).json({ ok: true })
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error) })
  }
}
