import { render, screen, waitFor } from '@testing-library/react'

import { CourseTextPackDesk } from '@/components/CourseTextPackDesk'

const workflow = {
  status: 'preflight_required',
  progress: 8,
  worker: { status: 'offline', message: '等待本地 Worker' },
  courseSpec: {
    courseName: '证据法',
    teacher: '张老师',
    goal: '全面笔记',
    detailLevel: 'high',
    nodeSplitThreshold: 12000,
    qualityThreshold: 75
  },
  lessons: [
    {
      key: 'lesson-01',
      title: '第1课',
      status: 'preflight_required',
      transcript: '第一行\n第二行',
      outline: [],
      nodes: []
    }
  ],
  errors: []
}

describe('CourseTextPackDesk', () => {
  beforeEach(() => {
    fetch.mockImplementation(url => {
      if (String(url).includes('/api/courses/textpack')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            jobs: [
              {
                id: 'job-1',
                course_name: '证据法',
                teacher: '张老师',
                current_node: 'preflight',
                preferences: { textpack_stats: { lessonCount: 1, totalChars: 120 } },
                preprocess_result: { workflow },
                updated_at: '2026-06-26T08:00:00.000Z'
              }
            ]
          })
        })
      }
      if (String(url).includes('/api/courses/capabilities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            courseWriting: { configured: false, models: {} },
            localProcessing: { configured: false, status: 'unknown' }
          })
        })
      }
      if (String(url).includes('/api/courses/jobs/job-1/workflow')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, workflow, job: { id: 'job-1' } })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders course overview and opens the observable workflow desk', async () => {
    render(<CourseTextPackDesk />)

    await waitFor(() => expect(screen.getAllByText('证据法').length).toBeGreaterThan(0))
    screen.getByRole('button', { name: '继续处理' }).click()

    await waitFor(() => expect(screen.getByText('课程偏好')).toBeInTheDocument())
    expect(screen.getAllByText('未连接').length).toBeGreaterThan(0)
    expect(screen.getAllByText('课程写作服务').length).toBeGreaterThan(0)
    expect(screen.getByText('大纲编辑')).toBeInTheDocument()
    expect(screen.getByText('节点工作台')).toBeInTheDocument()
    expect(screen.getByText('最终 Markdown')).toBeInTheDocument()
  })
})
