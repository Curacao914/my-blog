import {
  createAgentConfigDraft,
  publishAgentConfig,
  rollbackAgentConfig,
  updateAgentConfigDraft
} from '@/lib/server/openclawAgentConfigs'
import { supabaseRest } from '@/lib/server/supabase'

jest.mock('@/lib/server/supabase', () => ({ supabaseRest: jest.fn() }))

describe('OpenClaw Agent Studio config store', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates the next immutable version in one environment', async () => {
    supabaseRest
      .mockResolvedValueOnce([{ version_number: 3 }])
      .mockResolvedValueOnce([{ id: 'config-4', version_number: 4, status: 'draft' }])

    const row = await createAgentConfigDraft({
      ownerId: 'owner-1',
      environment: 'preview',
      profile: {},
      parentConfigId: 'config-3'
    })

    expect(row.version_number).toBe(4)
    expect(supabaseRest.mock.calls[1][0]).toContain('/openclaw_agent_configs')
    expect(JSON.parse(supabaseRest.mock.calls[1][1].body)).toEqual(
      expect.objectContaining({
        owner_id: 'owner-1',
        environment: 'preview',
        version_number: 4,
        status: 'draft',
        parent_config_id: 'config-3'
      })
    )
  })

  it('updates drafts but refuses in-place changes to published versions', async () => {
    supabaseRest.mockResolvedValueOnce([{ id: 'config-1', status: 'published' }])
    await expect(updateAgentConfigDraft({
      ownerId: 'owner-1',
      environment: 'production',
      configId: 'config-1',
      profile: {}
    })).rejects.toThrow(/immutable/i)
    expect(supabaseRest).toHaveBeenCalledTimes(1)
  })

  it('rejects stale draft edits by checksum before writing', async () => {
    supabaseRest.mockResolvedValueOnce([{
      id: 'config-1', status: 'draft', checksum: 'current-checksum'
    }])
    await expect(updateAgentConfigDraft({
      ownerId: 'owner-1',
      environment: 'preview',
      configId: 'config-1',
      expectedChecksum: 'stale-checksum',
      profile: {}
    })).rejects.toThrow(/concurrent|stale/i)
    expect(supabaseRest).toHaveBeenCalledTimes(1)
  })

  it('publishes only through the transactional evaluation-gated RPC', async () => {
    supabaseRest.mockResolvedValueOnce([{ id: 'config-2', status: 'published' }])
    const row = await publishAgentConfig({
      ownerId: 'owner-1',
      environment: 'preview',
      configId: 'config-2',
      evaluationRunId: 'run-2'
    })
    expect(row.status).toBe('published')
    expect(supabaseRest).toHaveBeenCalledWith(
      '/rpc/publish_openclaw_agent_config',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(supabaseRest.mock.calls[0][1].body)).toEqual({
      p_owner_id: 'owner-1',
      p_environment: 'preview',
      p_config_id: 'config-2',
      p_eval_run_id: 'run-2'
    })
  })

  it('rolls back by creating and publishing a new version', async () => {
    supabaseRest.mockResolvedValueOnce([{
      id: 'config-5',
      version_number: 5,
      rollback_of_config_id: 'config-2',
      status: 'published'
    }])
    const row = await rollbackAgentConfig({
      ownerId: 'owner-1',
      environment: 'production',
      targetConfigId: 'config-2',
      evaluationRunId: 'run-5'
    })
    expect(row.rollback_of_config_id).toBe('config-2')
    expect(supabaseRest.mock.calls[0][0]).toBe('/rpc/rollback_openclaw_agent_config')
  })

  it('rejects environment crossover before hitting the database', async () => {
    await expect(createAgentConfigDraft({
      ownerId: 'owner-1',
      environment: 'staging',
      profile: {}
    })).rejects.toThrow(/environment/i)
    expect(supabaseRest).not.toHaveBeenCalled()
  })
})
