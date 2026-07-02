import {
  assertCoursePipelineStorageSafe,
  mergeCoursePipelineTaskPatch,
  normalizeCoursePipelineDiscovery,
  normalizeCoursePipelineStagePatch,
  summarizeCoursePipelineTasks
} from '@/lib/course/pipelinePayload'

describe('course pipeline payloads', () => {
  test('deduplicates a discovery batch', () => {
    const rows = normalizeCoursePipelineDiscovery({
      replays: [
        {
          replayKey: 'replay-a',
          courseKey: 'course-a',
          courseName: '国际法学'
        },
        {
          replayKey: 'replay-a',
          courseKey: 'course-a',
          courseName: '国际法学'
        }
      ]
    })
    expect(rows).toHaveLength(1)
  })

  test('rejects signed or ordinary URLs in artifacts', () => {
    expect(() =>
      normalizeCoursePipelineStagePatch({
        stage: 'downloaded',
        artifacts: {
          mediaObjectKey:
            'https://example.test/video.mp4?signature=x'
        }
      })
    ).toThrow(/object key, not a URL/)
  })

  test('rejects credential-shaped artifact fields', () => {
    expect(() =>
      assertCoursePipelineStorageSafe({
        artifacts: {
          accessToken: 'secret'
        }
      })
    ).toThrow(/forbidden field/)
  })

  test('merges object references and increments attempts', () => {
    const patch = normalizeCoursePipelineStagePatch({
      stage: 'downloaded',
      artifacts: {
        mediaObjectKey: 'courses/a/video.mp4'
      },
      runtime: {
        bytes: 1200
      }
    })
    const result = mergeCoursePipelineTaskPatch(
      {
        attempts: {},
        artifacts: {},
        runtime: {},
        history: []
      },
      patch,
      new Date('2026-06-29T12:00:00.000Z')
    )

    expect(result.attempts.downloaded).toBe(1)
    expect(result.artifacts.mediaObjectKey).toBe(
      'courses/a/video.mp4'
    )
    expect(result.runtime.bytes).toBe(1200)
  })

  test('summarizes independent course stages', () => {
    expect(
      summarizeCoursePipelineTasks([
        { stage: 'queued' },
        { stage: 'completed' },
        { stage: 'failed' }
      ])
    ).toEqual({
      total: 3,
      stages: {
        queued: 1,
        completed: 1,
        failed: 1
      },
      active: 2
    })
  })
})
