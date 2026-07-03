import {
  normalizeDateFilter,
  resolveTargets
} from '@/lib/openclaw/agent/entityResolver'

describe('OpenClaw Agent entity resolution', () => {
  const courseCandidates = [
    {
      id: '11111111-1111-4111-8111-111111111111:lesson-a',
      type: 'course_brief',
      title: '国际法 · 6月3日课程简报',
      courseName: '国际法',
      lessonTitle: '2026年6月3日',
      read: false
    },
    {
      id: '22222222-2222-4222-8222-222222222222:lesson-b',
      type: 'course_brief',
      title: '国际法 · 6月10日课程简报',
      courseName: '国际法',
      lessonTitle: '2026年6月10日',
      read: false
    }
  ]

  test('normalizes Chinese month/day to an ISO date', () => {
    expect(
      normalizeDateFilter('6月3号', new Date('2026-07-03T00:00:00Z'))
    ).toBe('2026-06-03')
  })

  test('resolves a real course brief by course and lesson date', () => {
    const result = resolveTargets({
      plan: {
        scope: 'single',
        target: {
          query: '国际法6月3号的笔记',
          filters: {
            courseName: '国际法',
            lessonDate: '2026-06-03'
          }
        }
      },
      candidates: courseCandidates,
      now: new Date('2026-07-03T00:00:00Z')
    })
    expect(result.status).toBe('resolved')
    expect(result.targets).toHaveLength(1)
    expect(result.targets[0].id).toBe(courseCandidates[0].id)
  })

  test('resolves “这个” from structured last-created context', () => {
    const schedule = {
      id: '33333333-3333-4333-8333-333333333333',
      type: 'schedule',
      title: 'Agent 真机验收',
      date: '2026-07-04'
    }
    const result = resolveTargets({
      plan: {
        scope: 'selected',
        target: {
          contextRefs: ['lastCreated']
        }
      },
      candidates: [schedule],
      session: {
        lastCreatedObject: schedule
      }
    })
    expect(result.strategy).toBe('context')
    expect(result.targets[0].id).toBe(schedule.id)
  })

  test('all_unread selects the complete unread resource set', () => {
    const result = resolveTargets({
      plan: {
        scope: 'all_unread',
        target: { filters: { read: false } }
      },
      candidates: [
        ...courseCandidates,
        {
          ...courseCandidates[0],
          id: '44444444-4444-4444-8444-444444444444:lesson-c',
          read: true
        }
      ]
    })
    expect(result.targets).toHaveLength(2)
    expect(result.targets.every(item => item.read === false)).toBe(true)
  })
})
