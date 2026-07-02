import { courseAutomationPlan } from '@/lib/course/automationSchedule'

describe('course automation schedule plan', () => {
  it('runs once after the configured Shanghai time', () => {
    const due = courseAutomationPlan({
      courseAutomationEnabled: true,
      courseScanTime: '02:00',
      courseLastScheduledDate: ''
    }, {
      now: new Date('2026-06-30T18:15:00.000Z'),
      trigger: 'scheduled'
    })
    expect(due.runCycle).toBe(true)
    expect(due.dateKey).toBe('2026-07-01')

    const done = courseAutomationPlan({
      courseAutomationEnabled: true,
      courseScanTime: '02:00',
      courseLastScheduledDate: '2026-07-01'
    }, {
      now: new Date('2026-06-30T18:30:00.000Z'),
      trigger: 'scheduled'
    })
    expect(done.runCycle).toBe(false)
  })

  it('respects the enable switch and keeps manual cycle available', () => {
    expect(courseAutomationPlan({
      courseAutomationEnabled: false
    }, { trigger: 'scheduled' }).runCycle).toBe(false)
    expect(courseAutomationPlan({
      courseAutomationEnabled: false,
      courseCostMode: 'standard'
    }, { trigger: 'manual-cycle' })).toMatchObject({
      runCycle: true,
      costMode: 'standard'
    })
  })
})
