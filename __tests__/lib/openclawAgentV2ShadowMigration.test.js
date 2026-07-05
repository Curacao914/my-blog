const fs = require('fs')
const path = require('path')

describe('OpenClaw Agent v2 shadow trace migration', () => {
  const sql = fs.readFileSync(path.join(
    process.cwd(),
    'lib/db/migrations/20260704_openclaw_agent_shadow_traces.sql'
  ), 'utf8')

  it('isolates encrypted, expiring traces without changing business tables', () => {
    expect(sql).toContain('create table if not exists public.openclaw_agent_shadow_traces')
    expect(sql).toContain('message_ciphertext')
    expect(sql).toContain('legacy_reply_ciphertext')
    expect(sql).toContain("interval '30 days'")
    expect(sql).toMatch(/unique \(owner_id, channel, message_hash, config_id\)/)
    expect(sql).toMatch(/enable row level security/i)
    expect(sql).not.toMatch(/alter table public\.(schedule_items|course_jobs|course_brief_reads)/i)
  })
})
