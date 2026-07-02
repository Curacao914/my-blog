import {
  claimSpecificCoursePipelineTask
} from '@/lib/course/pipelineLeaseRepository'
import { supabaseRest } from '@/lib/server/supabase'

jest.mock('@/lib/server/supabase', () => ({
  supabaseRest: jest.fn()
}))

describe('specific course pipeline claim', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('claims one replay through the exact-key RPC', async () => {
    supabaseRest.mockResolvedValue([
      {
        replay_key: 'replay-1',
        stage: 'queued'
      }
    ])

    const task =
      await claimSpecificCoursePipelineTask(
        'owner-1',
        'replay-1',
        {
          workerId: 'e2e-worker',
          leaseSeconds: 1800
        }
      )

    expect(task.replay_key).toBe(
      'replay-1'
    )
    expect(supabaseRest)
      .toHaveBeenCalledWith(
        '/rpc/claim_course_pipeline_task_by_key',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            p_owner_id: 'owner-1',
            p_replay_key: 'replay-1',
            p_worker_id: 'e2e-worker',
            p_lease_seconds: 1800
          })
        })
      )
  })
})
