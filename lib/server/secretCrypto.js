import crypto from 'crypto'

function secretKey() {
  const raw = String(process.env.USER_SECRETS_ENCRYPTION_KEY || '').trim()
  if (!raw) throw new Error('USER_SECRETS_ENCRYPTION_KEY is not configured')
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex')
  try {
    const decoded = Buffer.from(raw, 'base64')
    if (decoded.length === 32) return decoded
  } catch {}
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptUserSecret(value) {
  const plain = String(value || '')
  if (!plain) return { ciphertext: null, iv: null, tag: null, hint: null }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    hint: plain.length <= 4 ? '••••' : `••••${plain.slice(-4)}`
  }
}

export function decryptUserSecret(record = {}) {
  if (!record.secret_ciphertext || !record.secret_iv || !record.secret_tag) return ''
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    secretKey(),
    Buffer.from(record.secret_iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(record.secret_tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(record.secret_ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8')
}
