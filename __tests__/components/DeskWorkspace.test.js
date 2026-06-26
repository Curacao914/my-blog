import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TodayBoard } from '@/components/TodayBoard'
import { ReadingBox } from '@/components/ReadingBox'

const longUrl = 'https://example.com/articles/a-very-long-reading-link-that-should-wrap-without-breaking-the-workspace-layout'

const items = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: '置顶焦点事项',
    section: '学习',
    sectionKey: 'study',
    contentType: 'action',
    date: 'today',
    time: '09:00',
    place: '书桌',
    priority: 'high',
    importance: 'important',
    urgency: 'urgent',
    isPinned: true,
    status: 'active',
    summary: '这是一段比较长的摘要，用来确认焦点卡不会挤压首屏，也不会因为文字长度破坏布局。',
    links: [{ title: '相关链接', url: longUrl }],
    children: [{ id: 'child-1', title: '子安排', done: false }]
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: '重要紧急事项',
    section: '事项',
    sectionKey: 'tasks',
    contentType: 'action',
    date: 'today',
    time: '14:00',
    priority: 'high',
    importance: 'important',
    urgency: 'urgent',
    status: 'active',
    summary: '第二个焦点。'
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: '已经完成的重要事项',
    section: '事项',
    sectionKey: 'tasks',
    contentType: 'action',
    date: 'today',
    time: '08:00',
    priority: 'high',
    importance: 'important',
    urgency: 'urgent',
    status: 'done'
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: '无固定时间事项',
    section: '行政',
    sectionKey: 'admin',
    contentType: 'action',
    date: 'none',
    priority: 'normal',
    importance: 'normal',
    urgency: 'not_urgent',
    status: 'active'
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    title: '待读长文章',
    section: '阅读',
    sectionKey: 'reading',
    contentType: 'reading',
    date: 'reading',
    priority: 'normal',
    importance: 'normal',
    urgency: 'not_urgent',
    status: 'active',
    source: 'wechat',
    summary: '阅读摘要预览，需要在列表和详情中保持可读。',
    links: [{ title: '原文', url: longUrl }],
    aiTrace: { tags: ['民法', '文章'] }
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    title: '已读旧文章',
    section: '阅读',
    sectionKey: 'reading',
    contentType: 'reading',
    date: 'reading',
    priority: 'normal',
    importance: 'normal',
    urgency: 'not_urgent',
    status: 'done',
    source: 'web',
    summary: '已经读完的内容不应该占用右栏主视觉。'
  }
]

function mockScheduleFetch(nextItems = items) {
  fetch.mockImplementation((url) => {
    if (String(url).includes('/api/schedule/items')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: nextItems })
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
}

describe('workspace desk views', () => {
  it('renders Today with at most two focus cards and independent main/side stacks', async () => {
    mockScheduleFetch()
    const { container } = render(<TodayBoard />)

    await waitFor(() => expect(screen.getByText('置顶焦点事项')).toBeInTheDocument())

    expect(container.querySelectorAll('.focus-card')).toHaveLength(2)
    expect(container.querySelector('.focus-strip')).not.toHaveTextContent('已经完成的重要事项')
    expect(container.querySelectorAll('.today-stack')).toHaveLength(2)
    expect(screen.getByText('无固定时间事项')).toBeInTheDocument()
    expect(screen.getByText('待读长文章')).toBeInTheDocument()
    expect(screen.getByText('今日阅读')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /已完成 2/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps four-quadrant as a separate editable view', async () => {
    mockScheduleFetch()
    const { container } = render(<TodayBoard />)

    await waitFor(() => expect(screen.getByText('四象限')).toBeInTheDocument())
    fireEvent.click(screen.getByText('四象限'))

    expect(container.querySelectorAll('.matrix-lane')).toHaveLength(4)
    expect(screen.getByText('重要且紧急')).toBeInTheDocument()
    expect(screen.getAllByText('编辑').length).toBeGreaterThan(0)
  })

  it('renders Reading as list plus detail with reliable note action state', async () => {
    mockScheduleFetch()
    render(<ReadingBox />)

    await waitFor(() => expect(screen.getAllByText('待读长文章').length).toBeGreaterThan(0))

    expect(screen.getByText('微信')).toBeInTheDocument()
    expect(screen.getAllByText('民法').length).toBeGreaterThan(0)
    expect(screen.getByText('原文')).toHaveAttribute('href', longUrl)
    expect(screen.getByRole('button', { name: '存为笔记草稿' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /已读 1/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('已读旧文章')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /已读 1/ }))
    expect(screen.getByText('已读旧文章')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '移回待读' })).toBeInTheDocument()
  })

  it('does not show a working note-draft action for local-only reading items', async () => {
    mockScheduleFetch([{ ...items[4], id: 'local-reading-id' }])
    render(<ReadingBox />)

    await waitFor(() => expect(screen.getAllByText('待读长文章').length).toBeGreaterThan(0))
    expect(screen.getByRole('button', { name: '草稿后续接入' })).toBeDisabled()
  })
})
