import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { CourseTaskProvider, useCourseTaskManager } from '@/components/CourseTaskManager'
import { requestCourseJson } from '@/lib/course/clientApi'

const push = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({ push, pathname: '/desk/today' })
}))

jest.mock('@/lib/course/clientApi', () => {
  const actual = jest.requireActual('@/lib/course/clientApi')
  return {
    ...actual,
    requestCourseJson: jest.fn()
  }
})

function Starter({ onLeave }) {
  const { startTask } = useCourseTaskManager()
  return <div>
    <button type='button' onClick={() => startTask('job-1', { courseName: '国际法' })}>开始</button>
    <button type='button' onClick={onLeave}>离开课程页</button>
  </div>
}

function Harness() {
  const [inside, setInside] = useState(true)
  return <CourseTaskProvider>
    {inside ? <Starter onLeave={() => setInside(false)} /> : <div>今日页面</div>}
  </CourseTaskProvider>
}

describe('CourseTaskProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    requestCourseJson.mockReset()
    push.mockReset()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  })

  it('starts one durable orchestrator and only polls a lightweight summary after leaving the course page', async () => {
    requestCourseJson.mockImplementation(async (url, options = {}) => {
      if (String(url).endsWith('/orchestrator')) {
        expect(options.method).toBe('POST')
        return { ok: true, runId: 'run-1', status: 'pending' }
      }
      if (String(url).includes('/workflow?summary=1')) {
        return {
          job: { id: 'job-1', course_name: '国际法', current_node: 'outline_review' },
          runtime: {
            status: 'outline_review',
            progress: 28,
            workflowVersion: 2,
            counts: { total: 0, approved: 0, attention: 0 }
          },
          orchestrator: { runId: 'run-1', state: 'waiting', waitingReason: 'waiting-outline-approval' }
        }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '开始' }))
    fireEvent.click(screen.getByRole('button', { name: '离开课程页' }))

    expect(screen.getByText('今日页面')).toBeInTheDocument()
    await waitFor(() => expect(requestCourseJson).toHaveBeenCalledWith(
      '/api/courses/jobs/job-1/orchestrator',
      expect.objectContaining({ method: 'POST' }),
      '课程后台任务启动失败'
    ))
    await waitFor(() => expect(requestCourseJson).toHaveBeenCalledWith(
      '/api/courses/jobs/job-1/workflow?summary=1',
      {},
      '课程进度读取失败'
    ))
    expect(requestCourseJson.mock.calls.some(([url]) => String(url).includes('/run-next'))).toBe(false)
    await waitFor(() => expect(screen.getByText('大纲待确认')).toBeInTheDocument())
  })
})
