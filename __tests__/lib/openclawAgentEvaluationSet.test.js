const evaluation = require('../fixtures/openclaw-agent-eval-v1.json')

describe('OpenClaw Agent fixed natural-language evaluation set', () => {
  test('is versioned and covers required first-stage behavior', () => {
    expect(evaluation.version).toBe(1)
    expect(evaluation.cases.length).toBeGreaterThanOrEqual(30)
    const capabilities = new Set(
      evaluation.cases
        .map(item => item.expected?.capability)
        .filter(Boolean)
    )
    expect(capabilities.has('schedule.create')).toBe(true)
    expect(capabilities.has('schedule.update')).toBe(true)
    expect(capabilities.has('reading.create')).toBe(true)
    expect(capabilities.has('reading.mark_read')).toBe(true)
    expect(capabilities.has('course.brief.mark_read')).toBe(true)
    expect(
      evaluation.cases.some(item =>
        item.expected?.scope === 'all_unread'
      )
    ).toBe(true)
    expect(
      evaluation.cases.some(item =>
        item.input.includes('时间改到十点')
      )
    ).toBe(true)
  })
})
