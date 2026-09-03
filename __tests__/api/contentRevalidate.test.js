import handler from '@/pages/api/content/revalidate'
import { requireAdminRequest } from '@/lib/auth/serverAdmin'

jest.mock('@/lib/auth/serverAdmin', () => ({
  requireAdminRequest: jest.fn()
}))

function createRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    revalidate: jest.fn(async () => {}),
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/content/revalidate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fails closed for a non-admin request', async () => {
    requireAdminRequest.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const req = { method: 'POST', body: { path: '/zh-CN/article/test' } }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res.revalidate).not.toHaveBeenCalled()
  })

  it('revalidates the current page and related content surfaces only on demand', async () => {
    requireAdminRequest.mockResolvedValue({ ok: true, userId: 'admin-1' })
    const req = { method: 'POST', body: { path: '/zh-CN/article/test?preview=1#top' } }
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN/article/test')
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN')
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN/archive')
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN/content')
    expect(res.revalidate).toHaveBeenCalledWith('/zh-CN/search')
  })
})
