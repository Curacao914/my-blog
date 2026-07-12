import { fromDbScheduleItem, toDbScheduleItem } from '@/lib/domain/schedule'
import { isReadingFolder, isReadingItem } from '@/lib/reading/library'
import {
  deleteScheduleRows,
  listScheduleRows,
  listScheduleRowsByIds,
  upsertScheduleRows
} from '@/lib/server/supabase'
import { getScheduleOwner } from '@/lib/auth/scheduleOwner'

const MAX_MUTATION_ITEMS = 500

function isUuid(value = '') {
  return /^[0-9a-f-]{36}$/i.test(String(value || ''))
}

function validReadingEntity(item) {
  return item && isUuid(item.id) && (isReadingFolder(item) || isReadingItem(item))
}

function readingItemsFromRows(rows = []) {
  return rows
    .map(fromDbScheduleItem)
    .filter(item => isReadingFolder(item) || isReadingItem(item))
}

function duplicateIds(items = []) {
  const seen = new Set()
  const duplicates = new Set()
  items.forEach(item => {
    if (!item?.id) return
    if (seen.has(item.id)) duplicates.add(item.id)
    seen.add(item.id)
  })
  return [...duplicates]
}

export default async function handler(req, res) {
  const owner = await getScheduleOwner(req, 'reading')
  if (!owner.ok) {
    return res.status(owner.status).json({ error: owner.error, code: owner.code })
  }
  const profile = owner.profile

  res.setHeader('Cache-Control', 'private, no-store, max-age=0')

  try {
    if (req.method === 'GET') {
      const rows = await listScheduleRows(profile.id)
      return res.status(200).json({ items: readingItemsFromRows(rows || []) })
    }

    if (req.method === 'PATCH') {
      const rawUpserts = Array.isArray(req.body?.upserts) ? req.body.upserts : []
      const rawDeletedIds = Array.isArray(req.body?.deletedIds) ? req.body.deletedIds : []

      if (
        rawUpserts.length > MAX_MUTATION_ITEMS ||
        rawDeletedIds.length > MAX_MUTATION_ITEMS
      ) {
        return res.status(413).json({ error: 'Reading mutation is too large' })
      }

      if (rawUpserts.some(item => !validReadingEntity(item))) {
        return res.status(400).json({ error: 'Reading endpoint only accepts UUID reading entities' })
      }
      if (rawDeletedIds.some(id => !isUuid(id))) {
        return res.status(400).json({ error: 'Reading deletion IDs must be UUIDs' })
      }
      if (duplicateIds(rawUpserts).length) {
        return res.status(400).json({ error: 'Reading mutation contains duplicate IDs' })
      }

      const deletedIds = [...new Set(rawDeletedIds)]
      const upsertIds = new Set(rawUpserts.map(item => item.id))
      if (deletedIds.some(id => upsertIds.has(id))) {
        return res.status(400).json({ error: 'Reading mutation cannot update and delete the same ID' })
      }

      const ownerRows = await listScheduleRows(profile.id)
      const ownerById = new Map((ownerRows || []).map(row => [row.id, row]))
      const referencedIds = [...new Set([...upsertIds, ...deletedIds])]
      const occupiedRows = await listScheduleRowsByIds(referencedIds)
      const foreignRow = (occupiedRows || []).find(row => row.owner_id !== profile.id)
      if (foreignRow) {
        return res.status(409).json({ error: 'Reading item ID is already in use' })
      }

      for (const item of rawUpserts) {
        const existing = ownerById.get(item.id)
        if (existing && !validReadingEntity(fromDbScheduleItem(existing))) {
          return res.status(409).json({ error: 'Cannot replace a non-reading schedule item' })
        }
      }
      for (const id of deletedIds) {
        const existing = ownerById.get(id)
        if (existing && !validReadingEntity(fromDbScheduleItem(existing))) {
          return res.status(409).json({ error: 'Cannot delete a non-reading schedule item' })
        }
      }

      if (deletedIds.length) {
        await deleteScheduleRows(profile.id, deletedIds)
      }
      if (rawUpserts.length) {
        await upsertScheduleRows(
          rawUpserts.map(item => toDbScheduleItem(item, profile.id))
        )
      }

      const rows = await listScheduleRows(profile.id)
      return res.status(200).json({ items: readingItemsFromRows(rows || []) })
    }

    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error instanceof Error ? error.message : 'Reading request failed'
    })
  }
}
