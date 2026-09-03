import { decryptUserSecret, encryptUserSecret } from '@/lib/server/secretCrypto'

describe('per-user secret encryption', () => {
  const previous = process.env.USER_SECRETS_ENCRYPTION_KEY

  beforeAll(() => {
    process.env.USER_SECRETS_ENCRYPTION_KEY = '11'.repeat(32)
  })

  afterAll(() => {
    if (previous === undefined) delete process.env.USER_SECRETS_ENCRYPTION_KEY
    else process.env.USER_SECRETS_ENCRYPTION_KEY = previous
  })

  it('round-trips a secret without storing plaintext', () => {
    const encrypted = encryptUserSecret('sk-example-secret-9abc')
    expect(encrypted.ciphertext).not.toContain('sk-example-secret')
    expect(encrypted.hint).toBe('••••9abc')
    expect(decryptUserSecret({
      secret_ciphertext: encrypted.ciphertext,
      secret_iv: encrypted.iv,
      secret_tag: encrypted.tag
    })).toBe('sk-example-secret-9abc')
  })

  it('requires a stable server encryption key', () => {
    delete process.env.USER_SECRETS_ENCRYPTION_KEY
    expect(() => encryptUserSecret('secret')).toThrow('USER_SECRETS_ENCRYPTION_KEY')
    process.env.USER_SECRETS_ENCRYPTION_KEY = '11'.repeat(32)
  })
})
