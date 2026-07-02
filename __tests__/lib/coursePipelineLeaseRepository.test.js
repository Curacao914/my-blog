import {
  claimCoursePipelineTask,
  heartbeatCoursePipelineTask
} from '@/lib/course/pipelineLeaseRepository'
import { supabaseRest } from '@/lib/server/supabase'

jest.mock('@/lib/server/supabase', () => ({
  supabaseRest: jest.fn()
}))

describe('course pipeline lease repository', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('claims through the atomic RPC', async () => {
    supabaseRest.mockResolvedValue([
      { replay_key: 'r1' }
    ])

    const task = await claimCoursePipelineTask(
      'owner-1',
      {
        workerId: 'worker-1',
        leaseSeconds: 900
      }
    )

    expect(task.replay_key).toBe('r1')
    expect(supabaseRest).toHaveBeenCalledWith(
      '/rpc/claim_course_pipeline_task',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          p_owner_id: 'owner-1',
          p_worker_id: 'worker-1',
          p_lease_seconds: 900
        })
      })
    )
  })

  test('heartbeats only the matching worker lease', async () => {
    supabaseRest.mockResolvedValue([
      { replay_key: 'r1' }
    ])

    await heartbeatCoursePipelineTask(
      'owner-1',
      'r1',
      {
        workerId: 'worker-1',
        leaseSeconds: 600
      }
    )

    expect(supabaseRest).toHaveBeenCalledWith(
      '/rpc/heartbeat_course_pipeline_task',
      expect.objectContaining({
        method: 'POST'
      })
    )
  })
})
