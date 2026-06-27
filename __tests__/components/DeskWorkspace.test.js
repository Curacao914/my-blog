import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TodayBoard } from '@/components/TodayBoard'
import { ReadingBox } from '@/components/ReadingBox'
import { NotesDesk } from '@/components/NotesDesk'

jest.mock('next/router', () => ({
  useRouter: () => ({
    isReady: true,
    query: {}
  })
}))

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
    title: '普通今天事项',
    section: '行政',
    sectionKey: 'admin',
    contentType: 'action',
    date: '2026-06-27',
    priority: 'normal',
    importance: 'normal',
    urgency: 'not_urgent',
    status: 'active'
  },
  {
    id: '45454545-4545-4545-8545-454545454545',
    title: '明日紧急事项',
    section: '写作',
    sectionKey: 'writing',
    contentType: 'action',
    date: '2026-06-28',
    time: '09:00',
    priority: 'high',
    importance: 'important',
    urgency: 'urgent',
    isPinned: true,
    status: 'active'
  },
  {
    id: '46464646-4646-4646-8646-464646464646',
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
    time: 'none',
    place: 'none',
    aiTrace: { tags: ['民法', 'none', '阅读', 'null', 'undefined', '文章'] }
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
  const RealDate = Date

  beforeAll(() => {
    const fixed = new RealDate('2026-06-27T04:00:00.000Z')
    global.Date = class extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [fixed.toISOString()]))
      }

      static now() {
        return fixed.getTime()
      }
    }
  })

  afterAll(() => {
    global.Date = RealDate
  })

  it('keeps Today strict while showing a quiet future preview', async () => {
    mockScheduleFetch()
    const { container } = render(<TodayBoard />)

    await waitFor(() => expect(screen.getByText('置顶焦点事项')).toBeInTheDocument())

    expect(container.querySelectorAll('.focus-card')).toHaveLength(2)
    expect(container.querySelector('.focus-strip')).not.toHaveTextContent('已经完成的重要事项')
    expect(container.querySelector('.focus-strip')).not.toHaveTextContent('明日紧急事项')
    expect(container.querySelectorAll('.today-stack').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('普通今天事项')).toBeInTheDocument()
    expect(screen.queryByText('无固定时间事项')).not.toBeInTheDocument()
    expect(screen.queryByText('待读长文章')).not.toBeInTheDocument()
    expect(screen.queryByText('今日阅读')).not.toBeInTheDocument()
    const later = container.querySelector('.today-later-list')
    expect(later).toHaveTextContent('明日紧急事项')
    expect(later).toHaveTextContent('明天')
    expect(later).not.toHaveTextContent('后天')
    expect(screen.getByRole('button', { name: /已完成 1/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps Today card title and metadata inside a stable content column', async () => {
    mockScheduleFetch([{ ...items[0], isPinned: false, importance: 'normal', urgency: 'not_urgent', priority: 'normal' }])
    const { container } = render(<TodayBoard />)

    await waitFor(() => expect(screen.getByText('置顶焦点事项')).toBeInTheDocument())

    const card = container.querySelector('[data-testid="today-card-focus"]')
    const layout = card.querySelector('[data-testid="today-card-layout"]')
    const content = card.querySelector('[data-testid="today-card-content"]')
    const title = card.querySelector('[data-testid="today-card-title"]')
    const meta = card.querySelector('[data-testid="today-card-meta"]')

    expect(layout).toContainElement(content)
    expect(content).toContainElement(title)
    expect(content).toContainElement(meta)
    expect(card).toHaveClass('has-check')
    expect(card.querySelector('.today-check')).not.toBeNull()
    expect(card.querySelector('[data-testid="today-card-actions"]')).not.toBeNull()
    expect(card.querySelector('[data-testid="today-card-actions"]')).toHaveTextContent('编辑')
    expect(title).toHaveTextContent('置顶焦点事项')
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
    expect(screen.queryByText('none')).not.toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
    expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    expect(screen.getByText('原文')).toHaveAttribute('href', longUrl)
    expect(screen.getByRole('button', { name: '存为笔记草稿' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /已读 1/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('已读旧文章')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /已读 1/ }))
    expect(screen.getByText('已读旧文章')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '移回待读' })).toBeInTheDocument()
  })

  it('does not show a working note-draft action for local-only reading items', async () => {
    mockScheduleFetch([{ ...items[6], id: 'local-reading-id' }])
    render(<ReadingBox />)

    await waitFor(() => expect(screen.getAllByText('待读长文章').length).toBeGreaterThan(0))
    expect(screen.getByRole('button', { name: '需要真实来源' })).toBeDisabled()
  })

  it('opens a real note draft link after Reading creates one', async () => {
    fetch.mockImplementation((url, options = {}) => {
      if (String(url).includes('/api/schedule/items') && options.method === 'PUT') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ items }) })
      }
      if (String(url).includes('/api/schedule/items')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ items }) })
      }
      if (String(url).includes('/api/notes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ note: { id: '77777777-7777-4777-8777-777777777777' }, existing: false })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    render(<ReadingBox />)

    await waitFor(() => expect(screen.getByRole('button', { name: '存为笔记草稿' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '存为笔记草稿' }))

    await waitFor(() => expect(screen.getByText('已生成笔记')).toBeInTheDocument())
    expect(screen.getByText('打开笔记')).toHaveAttribute('href', '/desk/inbox?noteId=77777777-7777-4777-8777-777777777777')
  })

  it('renders the inbox as persisted notes instead of the Today board', async () => {
    fetch.mockImplementation((url, options = {}) => {
      if (String(url).includes('/api/notes') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            note: {
              id: '88888888-8888-4888-8888-888888888888',
              title: '新的想法',
              body_markdown: '新的想法\n\n继续写。',
              note_type: 'quick_note',
              status: 'draft',
              metadata: { excerpt: '新的想法 继续写。' },
              updated_at: '2026-06-26T08:00:00.000Z'
            }
          })
        })
      }
      if (String(url).includes('/api/notes')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ notes: [] }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    render(<NotesDesk />)

    await waitFor(() => expect(screen.getByText('还没有草稿')).toBeInTheDocument())
    expect(screen.queryByPlaceholderText('写下今天要处理的事、阅读材料或提醒。')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('新建'))
    fireEvent.change(screen.getByPlaceholderText('标题可选'), { target: { value: '新的想法' } })
    fireEvent.change(screen.getByPlaceholderText('写下一句话想法、课堂片段、写作灵感或阅读草稿。'), {
      target: { value: '新的想法\n\n继续写。' }
    })
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => expect(screen.getByText('已保存')).toBeInTheDocument())
    expect(screen.getAllByText('新的想法').length).toBeGreaterThan(0)
  })
})
