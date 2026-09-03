import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const params = new URLSearchParams({ status: 'unavailable' })
  return res.redirect(302, `/auth/result?${params.toString()}`)
}
