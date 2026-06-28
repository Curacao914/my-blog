const fs = require('fs')
const path = require('path')
const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('multi-user ownership contracts', () => {
  const tasks = read('lib/tasksRepository.js')
  const content = read('lib/contentManagement.js')
  const courses = read('lib/courseRepository.js')
  const integrations = read('lib/server/userIntegrations.js')
  const taskReminders = read('lib/taskReminders.js')
  const today = read('components/TodayBoard.js')
  const courseTasks = read('components/CourseTaskManager.js')
  const migration = read('lib/db/migrations/20260628_multi_user_workspace.sql')

  it('requires owner ids for personal repositories', () => {
    expect(tasks).toContain('owner_id=eq.')
    expect(content).toContain('owner_id=eq.')
    expect(courses).toContain('owner_id=eq.')
    expect(migration).toContain('alter table tasks add column if not exists owner_id')
    expect(migration).toContain('alter table content_items add column if not exists owner_id')
    expect(migration).toContain('alter table course_jobs add column if not exists owner_id')
  })

  it('does not let members fall back to the administrators AI or email keys', () => {
    expect(integrations).toContain("if (profile.role === 'owner') return ownerGlobalAiConfig()")
    expect(integrations).toContain("if (profile.role === 'owner') return ownerGlobalEmailConfig()")
    expect(integrations).toContain("return { apiKey: '', baseUrl: '', models: {}, source: 'missing' }")
    expect(integrations).toContain("return { apiKey: '', from: '', source: 'missing' }")
  })

  it('namespaces browser caches by the effective profile and prevents cross-profile writes', () => {
    expect(today).toContain('law-tech.schedule.v3:${profileId')
    expect(today).toContain('loadedProfileRef.current !== profileId')
    expect(courseTasks).toContain('law-tech-course-active-tasks-v4:${profileId')
    expect(courseTasks).toContain('storageProfileRef.current === profileId')
  })

  it('keeps the legacy task reminder queue scoped to one explicit owner', () => {
    expect(taskReminders).toContain("if (!ownerId) throw new Error('ownerId is required')")
    expect(taskReminders).toContain('&owner_id=eq.${encodeURIComponent(ownerId)}')
    expect(taskReminders).toContain('markTaskReminderSent(ownerId, task.id)')
  })

  it('adds RLS policies for parent and child records', () => {
    expect(migration).toContain('tasks_owner_scope')
    expect(migration).toContain('content_versions_parent_owner')
    expect(migration).toContain('course_assets_parent_owner')
    expect(migration).toContain('profiles_owner_write')
  })
})
