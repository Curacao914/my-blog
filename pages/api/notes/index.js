import { getAuth } from '@clerk/nextjs/server'
import { fromDbScheduleItem } from '@/lib/domain/schedule'
import {
  ensureProfile,
  findScheduleRow,
  listNotes,
  upsertNote
} from '@/lib/server/supabase'

function getUserId(req) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return 'local-dev'
  return getAuth(req).userId
}

function makeReadingMarkdown(item, note = '') {
  const links = (item.links || [])
    .map(link => `- [${link.title || link.url}](${link.url})`)
    .join('\n')
  return [
    `# ${item.title || '未命名阅读'}`,
    '',
    item.summary ? `> ${item.summary}` : '',
    links ? `\n## 链接\n${links}` : '',
    `\n## 摘录与想法\n${note || ''}`,
    ''
  ].filter(Boolean).join('\n')
}

function notePayload({ item, note }) {
  return {
    title: item.title || '未命名阅读',
    body_markdown: makeReadingMarkdown(item, note),
    note_type: 'reading',
    status: 'draft',
    metadata: {
      source: 'reading-box',
      scheduleItemId: item.id,
      scheduleDate: item.date,
      time: item.time,
      section: item.section,
      links: item.links || [],
      summary: item.summary || ''
    },
    updated_at: new Date().toISOString()
  }
}

export default async function handler(req, res) {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { profile } = await ensureProfile({ clerkUserId: userId })

    if (req.method === 'GET') {
      const notes = await listNotes(profile.id, req.query.scheduleItemId)
      return res.status(200).json({ notes: notes || [] })
    }

    if (req.method === 'POST') {
      const scheduleItemId = req.body?.scheduleItemId
      if (!/^[0-9a-f-]{36}$/i.test(scheduleItemId || '')) {
        return res.status(400).json({ error: 'Invalid scheduleItemId' })
      }

      const row = await findScheduleRow(profile.id, scheduleItemId)
      if (!row) return res.status(404).json({ error: 'Reading item not found' })

      const item = fromDbScheduleItem(row)
      const payload = notePayload({ item, note: req.body?.note || item.note || '' })
      const existing = await listNotes(profile.id, scheduleItemId)
      const note = await upsertNote(profile.id, payload, existing?.[0]?.id)
      return res.status(200).json({ note })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error instanceof Error ? error.message : 'Notes request failed'
    })
  }
}
