import {
  getLiveContentBySlug,
  isContentExpired
} from '@/lib/contentSnapshots'
import { getPublishedContentBySlug } from '@/lib/contentRepository'
import { verifyPassword } from '@/lib/passwordHash'

function isDbContentExpired(row) {
  if (row.access?.mode !== 'password') return false
  if (!row.access?.expires_at) return false
  return Date.parse(row.access.expires_at) <= Date.now()
}

function unlockLiveSnapshot(snapshot, password, res) {
  if (snapshot.access?.mode !== 'password') {
    return res.status(400).json({ error: 'not_password_protected' })
  }

  if (isContentExpired(snapshot)) {
    return res.status(410).json({ error: 'expired' })
  }

  if (!password || password !== snapshot.access?.password) {
    return res.status(401).json({ error: 'invalid_password' })
  }

  return res.status(200).json({
    title: snapshot.title,
    slug: snapshot.slug,
    bodyMarkdown: snapshot.bodyMarkdown
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const { slug, password } = req.body || {}
  let dbRow = null
  let dbError = null

  try {
    dbRow = await getPublishedContentBySlug(slug)
  } catch (error) {
    dbError = error
  }

  if (dbRow) {
    if (dbRow.access?.mode !== 'password') {
      return res.status(400).json({ error: 'not_password_protected' })
    }

    if (isDbContentExpired(dbRow)) {
      return res.status(410).json({ error: 'expired' })
    }

    if (!dbRow.access?.password_hash) {
      return res.status(401).json({ error: 'password_not_configured' })
    }

    if (!verifyPassword(password, dbRow.access.password_hash)) {
      return res.status(401).json({ error: 'invalid_password' })
    }

    return res.status(200).json({
      title: dbRow.title,
      slug: dbRow.slug,
      bodyMarkdown: dbRow.version?.body_markdown || ''
    })
  }

  const snapshot = getLiveContentBySlug(slug)
  if (!snapshot) {
    return res.status(404).json({
      error: 'not_found',
      fallback: Boolean(dbError)
    })
  }

  return unlockLiveSnapshot(snapshot, password, res)
}
