import handler from '@/pages/api/knowledge/prompt'
import { requireWorkspaceRequest } from '@/lib/auth/serverAdmin'
import { resolveUserAiConfig } from '@/lib/server/userIntegrations'

jest.mock('@/lib/auth/serverAdmin', () => ({ requireWorkspaceRequest: jest.fn() }))
jest.mock('@/lib/server/userIntegrations', () => ({ resolveUserAiConfig: jest.fn() }))

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
    resolveUserAiConfig.mockResolvedValue({
      apiKey: 'secret',
      baseUrl: 'https://model.example/v1',
      models: { writer: 'writer-model' }
    })
  })

  it('asks the configured model to preserve arbitrary natural-language intent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '整理后的提示词' } }]
      })
    })
    const response = res()
    await handler({
      method: 'POST',
      body: { request: '先讲直觉，再指出我可能误解的地方；不要假设我有固定背景。' }
    }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body.prompt).toBe('整理后的提示词')
    const payload = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(payload.messages[0].content).toMatch(/保留.*全部.*要求/s)
    expect(payload.messages[0].content).toMatch(/不得.*固定.*结构/s)
    expect(payload.messages[1].content).toContain('不要假设我有固定背景')
  })
})
