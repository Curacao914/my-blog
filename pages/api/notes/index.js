import { fromDbScheduleItem } from '@/lib/domain/schedule'
import { cleanDisplayTags, cleanDisplayText, excerptText } from '@/lib/domain/metadata'
import {
  deleteNote,
  ensureProfile,
  findNote,
  findScheduleRow,
  listNotes,
  updateNote,
  upsertNote
} from '@/lib/server/supabase'
import { getScheduleOwnerUserId } from '@/lib/auth/scheduleOwner'

const uuidPattern = /^[0-9a-f-]{36}$/i

function isUuid(value = '') {
  return uuidPattern.test(value)
}

function noteTitleFromBody(body = '') {
  const firstLine = String(body)
    .split('\n')
    .map((line) => line.trim().replace(/^#+\s*/, ''))
    .find(Boolean)
  return (firstLine || '未命名随手记').slice(0, 80)
}

function normalizeNotePayload(body = {}) {
  const bodyMarkdown = cleanDisplayText(body.bodyMarkdown ?? body.contentMarkdown ?? body.body_markdown ?? body.content) || ''
  return {
    title: (cleanDisplayText(body.title) || noteTitleFromBody(bodyMarkdown)).slice(0, 120),
    body_markdown: bodyMarkdown,
    note_type: cleanDisplayText(body.noteType || body.originType) || 'quick_note',
    status: body.status === 'archived' ? 'archived' : 'draft',
    metadata: {
      originType: cleanDisplayText(body.originType) || 'quick_note',
      tags: cleanDisplayTags(body.tags, { limit: 8 }),
      excerpt: excerptText(bodyMarkdown, 180)
    },
    updated_at: new Date().toISOString()
  }
}

function readingMarkdown(item, note = '') {
  const sourceLink = item.links?.[0]?.url
  const linkLines = (item.links || [])
    .map((link) => `- [${link.title || link.url}](${link.url})`)
    .join('\n')
  return [
    `# ${item.title || '未命名阅读'}`,
    '',
    sourceLink ? `> 来源：[查看原文](${sourceLink})` : '',
    item.summary ? `\n## 摘要\n${item.summary}` : '',
    linkLines ? `\n## 原文链接\n${linkLines}` : '',
    item.note || note ? `\n## 摘录\n${item.note || note}` : '\n## 摘录\n',
    '\n## 我的想法\n',
    ''
  ].filter(Boolean).join('\n')
}

function readingNotePayload({ item, note }) {
  const tags = cleanDisplayTags(item.tags || item.aiTrace?.tags, { limit: 3, omitGenericReading: true })
  const sourceUrl = item.links?.[0]?.url || ''
  return {
    title: item.title || '未命名阅读',
    body_markdown: readingMarkdown(item, note),
    note_type: 'reading',
    status: 'draft',
    metadata: {
      originType: 'reading',
      source: 'reading-box',
      sourceReadingId: item.id,
      scheduleItemId: item.id,
      sourceUrl,
      scheduleDate: item.date,
      time: cleanDisplayText(item.time),
      section: cleanDisplayText(item.section),
      links: item.links || [],
      summary: cleanDisplayText(item.summary),
      tags,
      excerpt: excerptText(item.summary || item.note || note, 180)
    },
    updated_at: new Date().toISOString()
  }
}

async function findReadingDraft(ownerId, scheduleItemId) {
  const bySource = await listNotes(ownerId, { sourceReadingId: scheduleItemId, activeOnly: false, limit: 1 })
  if (bySource?.[0]) return bySource[0]
  const byLegacy = await listNotes(ownerId, { scheduleItemId, activeOnly: false, limit: 1 })
  return byLegacy?.[0] || null
}

function sendServerError(res, error) {
  if (error.status && error.status < 500) {
    return res.status(error.status).json({ error: error.message || 'Notes request failed' })
  }
  return res.status(500).json({ error: 'Notes request failed' })
}

export default async function handler(req, res) {
  const userId = await getScheduleOwnerUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { profile } = await ensureProfile({ clerkUserId: userId })

    if (req.method === 'GET') {
      const noteId = req.query.id || req.query.noteId
      if (noteId) {
        if (!isUuid(noteId)) return res.status(400).json({ error: 'Invalid note id' })
        const note = await findNote(profile.id, noteId)
        if (!note) return res.status(404).json({ error: 'Note not found' })
        return res.status(200).json({ note })
      }
      const notes = await listNotes(profile.id, {
        scheduleItemId: req.query.scheduleItemId,
        sourceReadingId: req.query.sourceReadingId,
        activeOnly: req.query.includeArchived !== 'true'
      })
      return res.status(200).json({ notes: notes || [] })
    }

    if (req.method === 'POST') {
      const scheduleItemId = req.body?.scheduleItemId || req.body?.sourceReadingId
      if (scheduleItemId) {
        if (!isUuid(scheduleItemId)) return res.status(400).json({ error: 'Invalid scheduleItemId' })
        const row = await findScheduleRow(profile.id, scheduleItemId)
        if (!row) return res.status(404).json({ error: 'Reading item not found' })

        const item = fromDbScheduleItem(row)
        if (item.contentType !== 'reading') return res.status(400).json({ error: 'Source item is not a reading record' })

        const existing = await findReadingDraft(profile.id, scheduleItemId)
        if (existing) return res.status(200).json({ note: existing, existing: true })

        const payload = readingNotePayload({ item, note: req.body?.note || item.note || '' })
        const note = await upsertNote(profile.id, payload)
        return res.status(200).json({ note, existing: false })
      }

      const payload = normalizeNotePayload(req.body || {})
      if (!payload.body_markdown.trim()) return res.status(400).json({ error: 'Note body is required' })
      const note = await upsertNote(profile.id, payload)
      return res.status(201).json({ note })
    }

    if (req.method === 'PATCH') {
      const id = req.body?.id || req.query.id
      if (!isUuid(id || '')) return res.status(400).json({ error: 'Invalid note id' })
      const existing = await findNote(profile.id, id)
      if (!existing) return res.status(404).json({ error: 'Note not found' })

      const patch = {}
      if ('title' in req.body) patch.title = (cleanDisplayText(req.body.title) || noteTitleFromBody(existing.body_markdown)).slice(0, 120)
      if ('bodyMarkdown' in req.body || 'contentMarkdown' in req.body || 'body_markdown' in req.body) {
        patch.body_markdown = cleanDisplayText(req.body.bodyMarkdown ?? req.body.contentMarkdown ?? req.body.body_markdown)
      }
      if ('status' in req.body) patch.status = req.body.status === 'archived' ? 'archived' : 'draft'
      if ('tags' in req.body || patch.body_markdown !== undefined) {
        patch.metadata = {
          ...(existing.metadata || {}),
          ...(req.body.tags ? { tags: cleanDisplayTags(req.body.tags, { limit: 8 }) } : {}),
          ...(patch.body_markdown !== undefined ? { excerpt: excerptText(patch.body_markdown, 180) } : {})
        }
      }
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'No note fields to update' })
      const note = await updateNote(profile.id, id, patch)
      if (!note) return res.status(404).json({ error: 'Note not found' })
      return res.status(200).json({ note })
    }

    if (req.method === 'DELETE') {
      const id = req.body?.id || req.query.id
      if (!isUuid(id || '')) return res.status(400).json({ error: 'Invalid note id' })
      await deleteNote(profile.id, id)
      return res.status(204).end()
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return sendServerError(res, error)
  }
}
