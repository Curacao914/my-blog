const serverOnlyMessage =
  'Database credentials are server-only. Do not import lib/db/client.js from client components.'

export function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const supabaseUrl = process.env.SUPABASE_URL || ''
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || ''

  return {
    databaseUrl,
    supabaseUrl,
    supabaseServiceRoleKey,
    storageBucket,
    configured: Boolean(databaseUrl || (supabaseUrl && supabaseServiceRoleKey))
  }
}

export function assertDatabaseConfigured() {
  const config = getDatabaseConfig()

  if (!config.configured) {
    throw new Error(
      'Database is not configured. Set DATABASE_URL or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return config
}

export function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error(serverOnlyMessage)
  }
}

export function getSupabaseRestConfig() {
  assertServerOnly()
  const config = assertDatabaseConfigured()

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase REST client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return {
    baseUrl: `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json'
    }
  }
}

export function getSupabaseStorageConfig() {
  assertServerOnly()
  const config = assertDatabaseConfigured()

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey || !config.storageBucket) {
    throw new Error(
      'Supabase Storage requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.'
    )
  }

  return {
    baseUrl: `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object`,
    bucket: config.storageBucket,
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`
    }
  }
}
