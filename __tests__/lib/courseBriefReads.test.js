import {
  applyCourseBriefReadState,
  courseBriefEntriesFromJobs,
  courseBriefFingerprint
} from '@/lib/server/courseBriefReads'

describe('course brief read state', () => {
  const jobs = [{
    id: 'job-1',
    course_name: '物权法',
    teacher: 'XJ',
    updated_at: '2026-07-02T01:00:00Z',
    preprocess_result: {
      workflow: {
        lessons: [{
          key: 'lesson-1',
          title: '善意取得',
          brief: {
            markdown: '# 善意取得\n核心内容',
            mainLine: '交易安全与权利保护',
            updatedAt: '2026-07-02T01:00:00Z'
          }
        }]
      }
    }
  }]

  it('extracts versioned brief entries from course workflows', () => {
    const entries = courseBriefEntriesFromJobs(jobs)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'course_brief',
      jobId: 'job-1',
      lessonKey: 'lesson-1',
      title: '物权法 · 善意取得'
    })
    expect(entries[0].fingerprint).toHaveLength(64)
  })

  it('becomes unread again when the brief fingerprint changes', () => {
    const [entry] = courseBriefEntriesFromJobs(jobs)
    const read = applyCourseBriefReadState([entry], [{
      course_job_id: 'job-1',
      lesson_key: 'lesson-1',
      brief_fingerprint: entry.fingerprint,
      read_at: '2026-07-02T02:00:00Z'
    }])
    expect(read[0].read).toBe(true)

    const changed = {
      ...entry,
      markdown: `${entry.markdown}\n新内容`
    }
    changed.fingerprint = courseBriefFingerprint(changed)
    expect(applyCourseBriefReadState([changed], [{
      course_job_id: 'job-1',
      lesson_key: 'lesson-1',
      brief_fingerprint: entry.fingerprint,
      read_at: '2026-07-02T02:00:00Z'
    }])[0].read).toBe(false)
  })
})
