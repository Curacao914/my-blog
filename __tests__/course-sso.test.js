import { createHmac } from 'node:crypto'
import { getWorkspaceSession } from '@/lib/auth/serverAdmin'
import courseSso, { makeCourseTicket, safeCoursePath } from '@/pages/api/course/sso'

jest.mock('@/lib/auth/serverAdmin', () => ({ getWorkspaceSession: jest.fn() }))

const ownerId = '69dc54b1-f8ec-4c69-b391-9add6d947751'
const secret = 'course-sso-test-key-with-32-bytes-or-more'

function response() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(key, value) { this.headers[key] = value; return this },
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
    redirect(code, value) { this.statusCode = code; this.location = value; return this }
  }
}

describe('Course SSO', () => {
  const originalKey = process.env.COURSE_CONTROL_SIGNING_KEY
  beforeEach(() => {
    process.env.COURSE_CONTROL_SIGNING_KEY = secret
    getWorkspaceSession.mockResolvedValue({
      ok: true,
      actorProfile: { id: ownerId, role: 'owner', status: 'active', email: 'owner@pku.edu.cn' }
    })
  })
  afterAll(() => {
    if (originalKey === undefined) delete process.env.COURSE_CONTROL_SIGNING_KEY
    else process.env.COURSE_CONTROL_SIGNING_KEY = originalKey
  })

  test('rejects protocol-relative, malformed, backslash, and control-character redirects', () => {
    expect(safeCoursePath('//bad.example')).toBe('/')
    expect(safeCoursePath('/%2f%2fexample.com')).toBe('/')
    expect(safeCoursePath('/%5cexample.com')).toBe('/')
    expect(safeCoursePath('/%E5%ZZ')).toBe('/')
    expect(safeCoursePath('/notes/%E6%B3%95%E5%BE%8B')).toBe('/notes/%E6%B3%95%E5%BE%8B')
  })

  test('issues a Course-compatible HMAC ticket with the stable profile UUID', () => {
    const token = makeCourseTicket({
      id: ownerId, role: 'owner', email: 'owner@pku.edu.cn',
      key: secret, next: '/notes/intro', now: 1000000, nonce: 'test'
    })
    const [body, signature] = token.split('.')
    expect(signature).toBe(createHmac('sha256', secret).update('course-sso-v1.' + body).digest('base64url'))
    expect(JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))).toEqual({
      v: 1, sub: ownerId, role: 'owner', email: 'owner@pku.edu.cn',
      iat: 1000, exp: 1060, nonce: 'test', next: '/notes/intro'
    })
  })

  test('authenticated active owner is redirected to the Course callback', async () => {
    const res = response()
    await courseSso({ method: 'GET', query: { next: '/admin' } }, res)
    expect(res.statusCode).toBe(302)
    expect(res.location).toMatch(/^https:\/\/course\.law-tech\.dev\/_auth\/callback\?token=/)
    expect(res.headers['Cache-Control']).toContain('no-store')
    expect(getWorkspaceSession).toHaveBeenCalledWith(expect.any(Object), { ignoreImpersonation: true })
  })

  test('signed-out users return through primary sign-in', async () => {
    getWorkspaceSession.mockResolvedValue({ ok: false, code: 'signed_out', status: 401 })
    const res = response()
    await courseSso({ method: 'GET', query: { next: '/notes/test' } }, res)
    expect(res.statusCode).toBe(302)
    expect(res.location).toContain('https://law-tech.dev/sign-in?redirect_url=')
  })

  test('never signs for an inactive identity or absent shared secret', async () => {
    getWorkspaceSession.mockResolvedValue({
      ok: true, actorProfile: { id: ownerId, role: 'member', status: 'pending' }
    })
    const inactive = response()
    await courseSso({ method: 'GET', query: {} }, inactive)
    expect(inactive.statusCode).toBe(403)
    getWorkspaceSession.mockResolvedValue({
      ok: true, actorProfile: { id: ownerId, role: 'owner', status: 'active' }
    })
    delete process.env.COURSE_CONTROL_SIGNING_KEY
    const unavailable = response()
    await courseSso({ method: 'GET', query: {} }, unavailable)
    expect(unavailable.statusCode).toBe(503)
  })
})
