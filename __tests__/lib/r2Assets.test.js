import {
  isNotionManagedAsset,
  signR2PutRequest
} from '@/lib/server/r2Assets'

describe('R2 Notion assets', () => {
  it('recognizes temporary Notion assets but leaves normal image hosts alone', () => {
    expect(isNotionManagedAsset('attachment:abc:image.png')).toBe(true)
    expect(isNotionManagedAsset('https://prod-files-secure.s3.us-west-2.amazonaws.com/a.png')).toBe(true)
    expect(isNotionManagedAsset('https://www.notion.so/image/https%3A%2F%2Fsecure.notion-static.com')).toBe(true)
    expect(isNotionManagedAsset('https://assets.law-tech.dev/manual/a.png')).toBe(false)
  })

  it('creates a deterministic path-style SigV4 request without an ACL header', () => {
    const signed = signR2PutRequest({
      config: {
        endpoint: 'https://example.r2.cloudflarestorage.com',
        publicBaseUrl: 'https://assets.example.com',
        bucket: 'assets',
        prefix: 'notion',
        accessKeyId: 'access',
        secretAccessKey: 'secret',
        region: 'auto'
      },
      key: 'notion/test.png',
      body: Buffer.from('hello'),
      date: new Date('2026-06-28T00:00:00.000Z')
    })

    expect(signed.url).toBe('https://example.r2.cloudflarestorage.com/assets/notion/test.png')
    expect(signed.headers.authorization).toContain('Credential=access/20260628/auto/s3/aws4_request')
    expect(signed.headers).not.toHaveProperty('x-amz-acl')
    expect(signed.headers['x-amz-content-sha256']).toHaveLength(64)
  })
})
