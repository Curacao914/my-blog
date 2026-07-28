import handler from '@/pages/api/knowledge/prompt'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'

jest.mock('@/lib/auth/serverAdmin', () => ({ requireWorkspaceRequest: jest.fn() }))

function res() {
  return {
    statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value; return this }
  }
}

describe('/api/knowledge/prompt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireWorkspaceRequest.mockResolvedValue({ ok: true, profile: { id: 'owner' } })
  })

  it('preserves arbitrary natural-language intent and only adds delivery rules', async () => {
    global.fetch = jest.fn()
    const response = res()
    const request = '先讲直觉，再指出我可能误解的地方；不要假设我有固定背景。'
    await handler({
      method: 'POST',
      body: { request }
    }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body.prompt).toContain(`<用户需求>\n${request}\n</用户需求>`)
    expect(response.body.prompt).toContain('不得新增研究问题、分论点或内容范围')
    expect(response.body.prompt).toContain('index.md')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
