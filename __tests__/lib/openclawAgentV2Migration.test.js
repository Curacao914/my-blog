const fs = require('fs')
const path = require('path')

describe('OpenClaw Agent Studio migration', () => {
  const sql = fs.readFileSync(path.join(
    process.cwd(),
    'lib/db/migrations/20260704_openclaw_agent_studio.sql'
  ), 'utf8')

  it('creates isolated config, case and run tables without business-table changes', () => {
    expect(sql).toContain('create table if not exists public.openclaw_agent_configs')
    expect(sql).toContain('create table if not exists public.openclaw_agent_eval_cases')
    expect(sql).toContain('create table if not exists public.openclaw_agent_eval_runs')
    expect(sql).not.toMatch(/alter table public\.(schedule_items|readings|course_jobs)/)
  })

  it('enforces one published config per owner and environment', () => {
    expect(sql).toMatch(/unique[\s\S]+owner_id[\s\S]+environment[\s\S]+where status = 'published'/i)
  })

  it('makes published versions immutable and gates publish through RPC', () => {
    expect(sql).toContain('prevent_published_openclaw_agent_config_update')
    expect(sql).toContain('publish_openclaw_agent_config')
    expect(sql).toContain('rollback_openclaw_agent_config')
    expect(sql).toMatch(/overall_score[\s\S]+0\.98/i)
    expect(sql).toMatch(/safety_score[\s\S]+1/i)
  })

  it('serializes version-changing publish and rollback transactions', () => {
    expect((sql.match(/pg_advisory_xact_lock/g) || [])).toHaveLength(2)
  })

  it('keeps evaluation input encrypted and enables RLS', () => {
    expect(sql).toContain('input_ciphertext')
    expect(sql).toContain('input_iv')
    expect(sql).toContain('input_tag')
    expect(sql).toMatch(/alter table public\.openclaw_agent_configs enable row level security/i)
    expect(sql).toMatch(/alter table public\.openclaw_agent_eval_cases enable row level security/i)
    expect(sql).toMatch(/alter table public\.openclaw_agent_eval_runs enable row level security/i)
  })
})
