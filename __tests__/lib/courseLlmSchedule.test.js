import {
  getCourseLlmWindowDecision,
  isCourseModelTask,
  normalizeCourseLlmSchedule
} from '@/lib/course/llmSchedule'

describe('course LLM price windows', () => {
  test('economy blocks the buffered morning peak in Beijing time', () => {
    const decision = getCourseLlmWindowDecision({
      now: new Date('2026-06-29T00:55:00.000Z'),
      schedule: {
        mode: 'economy',
        timezone: 'Asia/Shanghai',
        peakWindows: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '18:00' }
        ],
        boundaryBufferMinutes: 10
      }
    })

    expect(decision.allowed).toBe(false)
    expect(decision.reason).toBe('peak-price-window')
    expect(decision.activeWindow.start).toBe('09:00')
    expect(decision.retryAfterMs).toBeGreaterThan(0)
  })

  test('standard has no boundary buffer', () => {
    const beforePeak = getCourseLlmWindowDecision({
      now: new Date('2026-06-29T00:55:00.000Z'),
      schedule: {
        mode: 'standard',
        timezone: 'Asia/Shanghai'
      }
    })
    expect(beforePeak.allowed).toBe(true)

    const atPeak = getCourseLlmWindowDecision({
      now: new Date('2026-06-29T01:00:00.000Z'),
      schedule: {
        mode: 'standard',
        timezone: 'Asia/Shanghai'
      }
    })
    expect(atPeak.allowed).toBe(false)
  })

  test('immediate always allows the model call', () => {
    const decision = getCourseLlmWindowDecision({
      now: new Date('2026-06-29T02:00:00.000Z'),
      schedule: { mode: 'immediate' }
    })
    expect(decision.allowed).toBe(true)
    expect(decision.reason).toBe('immediate-override')
  })

  test('normalizes the official windows from an env string', () => {
    const schedule = normalizeCourseLlmSchedule({}, {
      COURSE_LLM_COST_MODE: 'economy',
      COURSE_LLM_TIMEZONE: 'Asia/Shanghai',
      COURSE_LLM_PEAK_WINDOWS: '09:00-12:00,14:00-18:00',
      COURSE_LLM_BOUNDARY_BUFFER_MINUTES: '10'
    })
    expect(schedule.peakWindows).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '18:00' }
    ])
  })

  test('only model-backed worker tasks are deferred', () => {
    expect(isCourseModelTask({ type: 'write-node' })).toBe(true)
    expect(isCourseModelTask({ type: 'assemble' })).toBe(true)
    expect(isCourseModelTask({ type: 'plan-nodes' })).toBe(false)
  })
})
