import handler from '@/pages/api/account/session'
import { getWorkspaceSession } from '@/lib/auth/serverAdmin'
import { listWorkspaceProfiles } from '@/lib/server/workspaceProfiles'

jest.mock('@/lib/auth/serverAdmin', () => ({
  getWorkspaceSession: jest.fn()
}))

jest.mock('@/lib/server/workspaceProfiles', () => ({
  listWorkspaceProfiles: jest.fn()
}))

function response() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
}

describe('account session stability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    listWorkspaceProfiles.mockResolvedValue([])
  })

  it('propagates a Clerk handshake redirect to the client', async () => {
    getWorkspaceSession.mockResolvedValue({
      ok: false,
      status: 401,
      code: 'handshake',
      error: 'Authentication handshake required',
      redirectUrl: 'https://clerk.example/handshake'
    })
    const res = response()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(401)
    expect(res.payload).toMatchObject({
      code: 'handshake',
      redirectUrl: 'https://clerk.example/handshake',
      retryable: false
    })
  })

  it('returns a stable session id with a verified workspace session', async () => {
    getWorkspaceSession.mockResolvedValue({
      ok: true,
      sessionId: 'sess_123',
      publicActor: { id: 'actor-1' },
      publicProfile: { id: 'profile-1' },
      isOwner: false,
      impersonating: false
    })
    const res = response()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload).toMatchObject({
      signedIn: true,
      sessionId: 'sess_123'
    })
  })
})
