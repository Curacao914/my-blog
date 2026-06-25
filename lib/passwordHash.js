import crypto from 'crypto'

const algorithm = 'scrypt'
const keyLength = 64

export function hashPassword(password) {
  const normalized = String(password || '')
  if (!normalized) {
    throw new Error('Password is required')
  }

  const salt = crypto.randomBytes(16).toString('base64url')
  const hash = crypto.scryptSync(normalized, salt, keyLength).toString('base64url')

  return `${algorithm}$${salt}$${hash}`
}

export function verifyPassword(password, storedHash) {
  const normalized = String(password || '')
  const serialized = String(storedHash || '')
  const [storedAlgorithm, salt, hash] = serialized.split('$')

  if (storedAlgorithm !== algorithm || !salt || !hash || !normalized) {
    return false
  }

  const expected = Buffer.from(hash, 'base64url')
  const actual = crypto.scryptSync(normalized, salt, expected.length)

  if (actual.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(actual, expected)
}
