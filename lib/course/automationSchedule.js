const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
const COST_MODES = new Set(['economy', 'standard', 'immediate'])

function localState(now, timezone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  )
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute)
  }
}

function clockMinute(value = '02:00') {
  if (!CLOCK.test(String(value))) return 120
  const [hour, minute] = String(value).split(':').map(Number)
  return hour * 60 + minute
}

export function courseAutomationPlan(
  config = {},
  { now = new Date(), trigger = 'scheduled' } = {}
) {
  const timezone = config.courseTimezone || 'Asia/Shanghai'
  const local = localState(now, timezone)
  const scanTime = CLOCK.test(config.courseScanTime || '')
    ? config.courseScanTime
    : '02:00'
  const enabled = config.courseAutomationEnabled !== false
  const manualCycle = trigger === 'manual-cycle'
  const due =
    enabled &&
    local.minute >= clockMinute(scanTime) &&
    config.courseLastScheduledDate !== local.dateKey

  return {
    runCycle: manualCycle || (trigger === 'scheduled' && due),
    reason: manualCycle
      ? 'manual-cycle'
      : !enabled
        ? 'automation-disabled'
        : due
          ? 'scheduled-due'
          : 'not-due',
    dateKey: local.dateKey,
    scanTime,
    timezone,
    costMode: COST_MODES.has(config.courseCostMode)
      ? config.courseCostMode
      : 'economy',
    cleanupMedia: config.courseCleanupMedia !== false,
    autoApproveOutline: config.courseAutoApproveOutline !== false
  }
}
