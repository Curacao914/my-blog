import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { CourseTextPackDesk } from '@/components/CourseTextPackDesk'

const workflow = {
  status: 'preflight_required',
  progress: 5,
  worker: { status: 'offline', lastSeenAt: null, message: '' },
  courseSpec: { courseName: '证据法', teacher: '张老师', goal: '全面笔记', detailLevel: 'high', qualityThreshold: 75 },
  lessons: [{ key: 'lesson-01', order: 1, title: '第1课', status: 'preflight_required', transcript: '第一行\n第二行', outline: [], nodes: [] }],
  errors: []
}

function response(body, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

describe('CourseTextPackDesk', () => {
  beforeEach(() => {
    fetch.mockImplementation((url, options = {}) => {
      if (String(url).includes('/api/courses/capabilities')) return response({ ok: true, courseWriting: { configured: false, models: {} }, onlineOcr: { configured: true, serviceUrl: 'https://ocr.example' }, onlineProcessing: { configured: false } })
      if (String(url).includes('/api/courses/jobs/job-1/workflow')) return response({ ok: true, workflow, job: { id: 'job-1' } })
      if (String(url).includes('/api/courses/textpack') && !options.method) return response({ ok: true, jobs: [{ id: 'job-1', course_name: '证据法', teacher: '张老师', preferences: { textpack_stats: { lessonCount: 1, totalChars: 120 } }, preprocess_result: { workflow }, updated_at: '2026-06-26T08:00:00.000Z' }] })
      return response({ ok: true })
    })
  })

  afterEach(() => jest.clearAllMocks())

  it('shows one understandable current stage instead of every internal panel', async () => {
    render(<CourseTextPackDesk />)
    await waitFor(() => expect(screen.getAllByText('证据法').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: '继续整理' }))

    await waitFor(() => expect(screen.getByText('确定笔记整理方式')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '保存偏好并继续' })).toBeInTheDocument()
    expect(screen.getByLabelText('服务状态')).toBeInTheDocument()
    expect(screen.getByText('OCR')).toBeInTheDocument()
    expect(screen.queryByText('本地处理服务')).not.toBeInTheDocument()
    expect(screen.queryByText('大纲编辑')).not.toBeInTheDocument()
    expect(screen.queryByText('最终 Markdown')).not.toBeInTheDocument()
  })

  it('does not contain a browser control that fabricates reviewer scores', async () => {
    render(<CourseTextPackDesk />)
    await waitFor(() => expect(screen.getAllByText('证据法').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: '保存并审查' })).not.toBeInTheDocument()
  })

  it('appends repeated file selections and drag-and-drop files without replacing earlier choices', async () => {
    const { container } = render(<CourseTextPackDesk />)
    await waitFor(() => expect(screen.getByRole('button', { name: '导入资料' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '导入资料' }))

    const input = container.querySelector('input[type="file"]')
    const first = new File(['first lesson'], '2026-03-12.txt', { type: 'text/plain', lastModified: 1 })
    const second = new File(['second lesson'], '第三周.md', { type: 'text/markdown', lastModified: 2 })
    const third = new File(['third lesson'], '课堂转录.srt', { type: 'text/plain', lastModified: 3 })

    fireEvent.change(input, { target: { files: [first] } })
    fireEvent.change(input, { target: { files: [second] } })
    fireEvent.drop(container.querySelector('.course-file-drop'), { dataTransfer: { files: [third] } })

    expect(screen.getByText('2026-03-12.txt')).toBeInTheDocument()
    expect(screen.getByText('第三周.md')).toBeInTheDocument()
    expect(screen.getByText('课堂转录.srt')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '移除' })).toHaveLength(3)
  })

  it('shows one current failure and keeps deduplicated old failures in history', async () => {
    const failedWorkflow = {
      ...workflow,
      status: 'failed',
      activeErrorId: 'current-error',
      lessons: [{ ...workflow.lessons[0], status: 'node_pending', nodes: [] }],
      errors: [
        { id: 'old-error-1', step: 'generate-outline', message: 'outline leaves transcript lines 531-2001 uncovered', resolvedAt: '2026-06-26T08:00:00.000Z' },
        { id: 'old-error-2', step: 'generate-outline', message: 'outline leaves transcript lines 531-2001 uncovered', resolvedAt: '2026-06-26T09:00:00.000Z' },
        { id: 'current-error', step: 'review-node', message: 'Model response must be valid JSON' }
      ]
    }
    fetch.mockImplementation((url, options = {}) => {
      if (String(url).includes('/api/courses/capabilities')) return response({ ok: true, courseWriting: { configured: true, models: {} }, onlineOcr: { configured: true } })
      if (String(url).includes('/api/courses/jobs/job-1/workflow')) return response({ ok: true, workflow: failedWorkflow, job: { id: 'job-1' } })
      if (String(url).includes('/api/courses/textpack') && !options.method) return response({ ok: true, jobs: [{ id: 'job-1', course_name: '证据法', preferences: { textpack_stats: { lessonCount: 1 } }, preprocess_result: { workflow: failedWorkflow } }] })
      return response({ ok: true })
    })

    render(<CourseTextPackDesk />)
    await waitFor(() => expect(screen.getAllByText('证据法').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: '继续整理' }))

    await waitFor(() => expect(screen.getByText('Model response must be valid JSON · 阶段：审查正文')).toBeInTheDocument())
    expect(screen.getAllByText(/Model response must be valid JSON/)).toHaveLength(1)
    expect(screen.getByText('历史诊断（1）')).toBeInTheDocument()
    expect(screen.queryByText('查看诊断信息')).not.toBeInTheDocument()
  })

})
