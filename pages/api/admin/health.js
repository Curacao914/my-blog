import BLOG from '@/blog.config'

import { getDatabaseConfig, getSupabaseRestConfig } from '@/lib/db/client'
import { hasAlgoliaAdmin, hasAlgoliaSearch } from '@/lib/content/algoliaSearch'
import { requireAdminRequest } from '@/lib/auth/serverAdmin'

const requiredTables = [
  { name: 'profiles', probeColumn: 'id' },
  { name: 'workspace_invites', probeColumn: 'id' },
  { name: 'user_integrations', probeColumn: 'id' },
  { name: 'content_items', probeColumn: 'id' },
  { name: 'content_versions', probeColumn: 'id' },
  { name: 'content_access', probeColumn: 'item_id' },
  { name: 'content_display', probeColumn: 'item_id' },
  { name: 'content_assets', probeColumn: 'id' },
  { name: 'share_links', probeColumn: 'id' },
  { name: 'tasks', probeColumn: 'id' },
  { name: 'schedule_items', probeColumn: 'id' },
  { name: 'reminders', probeColumn: 'id' },
  { name: 'reminder_events', probeColumn: 'id' },
  { name: 'reminder_preferences', probeColumn: 'owner_id' },
  { name: 'course_jobs', probeColumn: 'id' },
  { name: 'course_assets', probeColumn: 'id' }
]

async function checkTable(table) {
  const { baseUrl, headers } = getSupabaseRestConfig()
  const response = await fetch(
    `${baseUrl}/${table.name}?select=${table.probeColumn}&limit=1`,
    { headers }
  )

  return {
    table: table.name,
    ok: response.ok,
    status: response.status
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false })
  }

  const admin = await requireAdminRequest(req)
  if (!admin.ok) {
    return res.status(admin.status).json({ ok: false, error: admin.error })
  }

  const config = getDatabaseConfig()
  const basePayload = {
    ok: true,
    databaseConfigured: config.configured,
    supabaseConfigured: Boolean(
      config.supabaseUrl && config.supabaseServiceRoleKey
    ),
    storageConfigured: Boolean(config.storageBucket),
    notionConfigured: Boolean(String(BLOG.NOTION_PAGE_ID || '').trim()),
    algoliaSearchConfigured: hasAlgoliaSearch(),
    algoliaAdminConfigured: hasAlgoliaAdmin(),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    reminderSenderConfigured: Boolean(process.env.REMINDER_FROM),
    reminderCronConfigured: Boolean(process.env.CRON_SECRET)
  }

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return res.status(200).json({
      ...basePayload,
      databaseReachable: false,
      tables: []
    })
  }

  try {
    const tables = await Promise.all(requiredTables.map(checkTable))
    return res.status(200).json({
      ...basePayload,
      databaseReachable: tables.every(table => table.ok),
      tables
    })
  } catch (error) {
    return res.status(200).json({
      ...basePayload,
      databaseReachable: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      tables: []
    })
  }
}
