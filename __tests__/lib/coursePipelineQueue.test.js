import {
  classifyCoursePipelineFailure,
  createCoursePipelineQueue,
  nextCoursePipelineTask,
  recoverCoursePipelineQueue,
  releaseCourseLlmWaitingTasks,
  summarizeCoursePipelineQueue,
  transitionCoursePipelineTask,
  upsertDiscoveredCourseReplays
} from '@/lib/course/pipelineQueue'

function replay(replayKey, startsAtText) {
  return {
    replayKey,
    courseKey: `course-${replayKey}`,
    courseName: `课程 ${replayKey}`,
    title: `课次 ${replayKey}`,
    startsAtText,
    teacher: '教师'
  }
}

describe('course pipeline queue', () => {
  test('enqueues every newly discovered replay once', () => {
    const result = upsertDiscoveredCourseReplays(
      createCoursePipelineQueue('2026-06-29T00:00:00.000Z'),
      [
        replay('a', '2026-06-10 09:00:00'),
        replay('b', '2026-06-11 09:00:00'),
        replay('a', '2026-06-10 09:00:00')
      ],
      '2026-06-29T00:01:00.000Z'
    )
    expect(result.added).toEqual(['a', 'b'])
    expect(Object.keys(result.queue.tasks)).toHaveLength(2)
  })

  test('processes older lessons first', () => {
    const { queue } = upsertDiscoveredCourseReplays(
      createCoursePipelineQueue(),
      [
        replay('new', '2026-06-11 09:00:00'),
        replay('old', '2026-06-10 09:00:00')
      ]
    )
    expect(nextCoursePipelineTask(queue).replayKey).toBe('old')
  })

  test('recovers interrupted stages without losing artifacts', () => {
    let { queue } = upsertDiscoveredCourseReplays(
      createCoursePipelineQueue(),
      [replay('a', '2026-06-10 09:00:00')]
    )
    queue = transitionCoursePipelineTask(
      queue,
      'a',
      'transcribing',
      { artifacts: { audio: 'audio.wav' } }
    )
    const recovered = recoverCoursePipelineQueue(queue)
    expect(recovered.recovered).toEqual(['a'])
    expect(recovered.queue.tasks.a.stage).toBe('queued')
    expect(recovered.queue.tasks.a.artifacts.audio).toBe('audio.wav')
  })

  test('releases all LLM-waiting lessons when the window opens', () => {
    let { queue } = upsertDiscoveredCourseReplays(
      createCoursePipelineQueue(),
      [
        replay('a', '2026-06-10 09:00:00'),
        replay('b', '2026-06-11 09:00:00')
      ]
    )
    queue = transitionCoursePipelineTask(
      queue,
      'a',
      'awaiting_llm_window'
    )
    queue = transitionCoursePipelineTask(
      queue,
      'b',
      'awaiting_llm_window'
    )
    const result = releaseCourseLlmWaitingTasks(
      queue,
      { allowed: true }
    )
    expect(result.released).toEqual(['a', 'b'])
    expect(result.queue.tasks.a.stage).toBe('queued')
  })

  test('school network failures do not consume business attempts', () => {
    expect(
      classifyCoursePipelineFailure(
        new Error('媒体服务器 network timeout')
      )
    ).toEqual({
      kind: 'transient_network',
      retryable: true,
      consumesAttempt: false,
      stage: 'queued'
    })
  })

  test('summarizes independent multi-course stages', () => {
    let { queue } = upsertDiscoveredCourseReplays(
      createCoursePipelineQueue(),
      [
        replay('a', '2026-06-10 09:00:00'),
        replay('b', '2026-06-11 09:00:00')
      ]
    )
    queue = transitionCoursePipelineTask(
      queue,
      'a',
      'completed'
    )
    expect(summarizeCoursePipelineQueue(queue)).toEqual({
      total: 2,
      stages: {
        completed: 1,
        queued: 1
      },
      active: 1
    })
  })
})
