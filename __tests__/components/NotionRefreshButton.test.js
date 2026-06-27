import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import NotionRefreshButton from '@/components/NotionRefreshButton'

const replace = jest.fn(async () => true)

jest.mock('next/router', () => ({
  useRouter: () => ({ asPath: '/zh-CN/article/test?from=nav', replace })
}))

describe('NotionRefreshButton', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    replace.mockClear()
    fetch.mockReset()
  })

  it('stays hidden for a signed-in non-admin session', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ admin: false }) })
    render(<NotionRefreshButton />)
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/session', { credentials: 'same-origin' }))
    expect(screen.queryByRole('button', { name: /刷新 Notion 内容/ })).not.toBeInTheDocument()
  })

  it('lets an administrator refresh the current path on demand', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ admin: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    render(<NotionRefreshButton />)

    const button = await screen.findByRole('button', { name: '刷新 Notion 内容' })
    fireEvent.click(button)

    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(
      '/api/content/sync',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: '/zh-CN/article/test?from=nav' })
      })
    ))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/zh-CN/article/test?from=nav', undefined, { scroll: false }))
  })
})
