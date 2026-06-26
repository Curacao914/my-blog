import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { CourseTaskProvider, useCourseTaskManager } from '@/components/CourseTaskManager'
import { requestCourseJson } from '@/lib/course/clientApi'

const push = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({ push })
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
  })

  it('continues processing after the course page child is unmounted', async () => {
    requestCourseJson.mockImplementation(async url => {
      if (String(url).endsWith('/workflow')) {
        return {
          workflow: {
            status: 'outline_pending',
            progress: 12,
            courseSpec: { courseName: '国际法' },
            lessons: [{ key: 'lesson-1', status: 'outline_pending' }]
          }
        }
      }
      if (String(url).endsWith('/run-next')) {
        return {
          completedStep: 'generate-outline',
          workflow: {
            status: 'outline_review',
            progress: 28,
            courseSpec: { courseName: '国际法' },
            lessons: [{ key: 'lesson-1', status: 'outline_review' }]
          }
        }
      }
      throw new Error(`Unexpected URL: ${url}`)
    })

    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '开始' }))
    fireEvent.click(screen.getByRole('button', { name: '离开课程页' }))

    expect(screen.getByText('今日页面')).toBeInTheDocument()
    await waitFor(() => expect(requestCourseJson).toHaveBeenCalledWith(
      '/api/courses/jobs/job-1/run-next',
      { method: 'POST' },
      '课程处理失败'
    ))
    await waitFor(() => expect(screen.getByText('大纲待确认')).toBeInTheDocument())
  })
})
