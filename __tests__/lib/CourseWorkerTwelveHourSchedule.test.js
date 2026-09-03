const fs = require('fs')
const path = require('path')

function read(relative) {
  return fs.readFileSync(path.join(process.cwd(), relative), 'utf8')
}

describe('course worker twelve-hour schedule', () => {
  test('scans the teaching platform twice a day instead of polling every thirty minutes', () => {
    const workflow = read('.github/workflows/course-worker-remote-test.yml')
    expect(workflow).toContain("cron: '0 0,12 * * *'")
    expect(workflow).not.toContain("cron: '*/30 * * * *'")
    expect(workflow).toContain('media-cycle')
  })

  test('separates immediate transcription from economy-mode note generation', () => {
    const workflow = read('.github/workflows/course-worker-remote-test.yml')
    expect(workflow).toContain("cron: '30 16 * * *'")
    expect(workflow).toContain("operation='notes'")
    expect(workflow).toContain('--cost-mode economy')
    expect(workflow).toContain('Generate queued notes in economy mode')
  })

  test('uses current production code and validates the owner identity', () => {
    const workflow = read('.github/workflows/course-worker-remote-test.yml')
    expect(workflow).toContain("github.event_name == 'workflow_dispatch' && github.ref_name || 'main'")
    expect(workflow).toMatch(/required=\([\s\S]*COURSE_WORKER_OWNER_ID/)
    expect(workflow).not.toContain("codex/course-worker-v009c")
  })

  test('shows the same schedule in course settings', () => {
    const settings = read('components/CourseAutomationSettings.js')
    expect(settings).toContain('每天 08:00 与 20:00')
    expect(settings).toContain('每天 00:30 起')
    expect(settings).not.toContain('每 30 分钟轻量检查一次')
  })
})
