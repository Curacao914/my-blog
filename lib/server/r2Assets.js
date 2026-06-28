import crypto from 'crypto'

import BLOG from '@/blog.config'

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024
const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

function env(name, fallback = '') {
  return String(process.env[name] || fallback).trim()
}

export function getR2Config() {
  const accountId = env('R2_ACCOUNT_ID')
  const endpoint = env(
    'R2_ENDPOINT',
    accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''
  ).replace(/\/$/, '')
  const publicBaseUrl = env('R2_PUBLIC_BASE_URL').replace(/\/$/, '')
  const bucket = env('R2_BUCKET', 'law-tech-assets')
  const prefix = env('R2_NOTION_PREFIX', 'notion').replace(/^\/+|\/+$/g, '')
  const accessKeyId = env('R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY')
  const region = env('R2_REGION', 'auto')
  const maxBytes = Math.max(
    1024,
    Number(process.env.R2_NOTION_MAX_IMAGE_BYTES) || DEFAULT_MAX_BYTES
  )

  return {
    accountId,
    endpoint,
    publicBaseUrl,
    bucket,
    prefix,
    accessKeyId,
    secretAccessKey,
    region,
    maxBytes
  }
}

export function isR2Configured(config = getR2Config()) {
  return Boolean(
    config.endpoint &&
    config.publicBaseUrl &&
    config.bucket &&
    config.accessKeyId &&
    config.secretAccessKey
  )
}

export function isNotionManagedAsset(value) {
  const url = String(value || '').trim().toLowerCase()
  if (!url) return false
  return (
    url.startsWith('attachment:') ||
    url.includes('secure.notion-static.com') ||
    url.includes('prod-files-secure') ||
    url.includes('notion.so/image/') ||
    url.includes('notion.so/signed/')
  )
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding)
}

function encodePath(pathname) {
  return pathname
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/')
}

function timestampParts(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8)
  }
}

export function signR2PutRequest({
  config = getR2Config(),
  key,
  body,
  date = new Date()
}) {
  if (!isR2Configured(config)) {
    throw new Error('R2 credentials are not configured')
  }

  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body)
  const payloadHash = sha256(payload)
  const { amzDate, dateStamp } = timestampParts(date)
  const endpoint = new URL(config.endpoint)
  const canonicalUri = encodePath(`/${config.bucket}/${key}`)
  const canonicalHeaders = [
    `host:${endpoint.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    ''
  ].join('\n')
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n')
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest)
  ].join('\n')
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp)
  const regionKey = hmac(dateKey, config.region)
  const serviceKey = hmac(regionKey, 's3')
  const signingKey = hmac(serviceKey, 'aws4_request')
  const signature = hmac(signingKey, stringToSign, 'hex')
  const authorization = [
    'AWS4-HMAC-SHA256',
    `Credential=${config.accessKeyId}/${scope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`
  ].join(' ')

  return {
    url: `${config.endpoint}${canonicalUri}`,
    headers: {
      authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate
    },
    payload
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function extensionFor(contentType, sourceUrl) {
  const normalized = String(contentType || '').split(';')[0].trim().toLowerCase()
  const known = {
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp'
  }
  if (known[normalized]) return known[normalized]
  try {
    const pathname = new URL(sourceUrl).pathname
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i)
    if (match) return match[1].toLowerCase()
  } catch {}
  return 'bin'
}

function publicObjectUrl(config, key) {
  return `${config.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
}

async function objectExists(url) {
  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD' }, 8000)
    return response.ok
  } catch {
    return false
  }
}

export async function putR2Object({
  key,
  body,
  contentType = 'application/octet-stream',
  cacheControl = DEFAULT_CACHE_CONTROL,
  config = getR2Config()
}) {
  const signed = signR2PutRequest({ config, key, body })
  const response = await fetchWithTimeout(signed.url, {
    method: 'PUT',
    headers: {
      ...signed.headers,
      'content-type': contentType,
      'cache-control': cacheControl
    },
    body: signed.payload
  }, 30000)

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`R2 upload failed (${response.status}): ${details || response.statusText}`)
  }

  return publicObjectUrl(config, key)
}

function downloadableUrl(source, blockValue) {
  const raw = String(source || '').trim()
  if (!raw) return ''

  const notionHost = String(BLOG.NOTION_HOST || 'https://www.notion.so').replace(/\/$/, '')
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('/')) return `${notionHost}${raw}`

  if (raw.startsWith('attachment:')) {
    const blockId = String(blockValue?.id || '').trim()
    if (!blockId) throw new Error('Notion attachment is missing its block id')
    return `${notionHost}/image/${encodeURIComponent(raw)}?table=block&id=${encodeURIComponent(blockId)}`
  }

  if (/^(?:secure\.notion-static\.com|prod-files-secure)/i.test(raw)) {
    return `https://${raw}`
  }

  return raw
}

async function mirrorOneImage(source, blockValue, config) {
  const downloadUrl = downloadableUrl(source, blockValue)
  if (!downloadUrl) throw new Error('Notion image URL is empty')

  const response = await fetchWithTimeout(downloadUrl, {
    headers: { accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
    redirect: 'follow'
  }, 30000)
  if (!response.ok) {
    throw new Error(`Notion image download failed (${response.status})`)
  }

  const contentType = String(response.headers.get('content-type') || '').split(';')[0]
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`Notion asset is not an image (${contentType})`)
  }
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength && contentLength > config.maxBytes) {
    throw new Error(`Notion image exceeds ${config.maxBytes} bytes`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > config.maxBytes) {
    throw new Error(`Notion image exceeds ${config.maxBytes} bytes`)
  }

  const hash = sha256(bytes)
  const extension = extensionFor(contentType, downloadUrl)
  const key = `${config.prefix}/${hash}.${extension}`
  const publicUrl = publicObjectUrl(config, key)
  if (!(await objectExists(publicUrl))) {
    await putR2Object({
      key,
      body: bytes,
      contentType: contentType || 'application/octet-stream',
      config
    })
  }

  return {
    sourceUrl: source,
    publicUrl,
    key,
    hash,
    contentType: contentType || null,
    size: bytes.length
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

export async function mirrorNotionRecordMapImages(recordMap, options = {}) {
  const config = options.config || getR2Config()
  if (!isR2Configured(config)) {
    throw new Error('R2 image mirroring is enabled but R2 credentials are incomplete')
  }

  const result = clone(recordMap)
  const manifest = []
  const failures = []
  const blocks = result?.block || {}

  for (const [blockId, wrapper] of Object.entries(blocks)) {
    const value = wrapper?.value?.value || wrapper?.value
    if (!value || typeof value !== 'object') continue

    const targets = []
    const source = value.properties?.source?.[0]?.[0]
    if (value.type === 'image' && isNotionManagedAsset(source)) {
      targets.push({
        source,
        apply: next => { value.properties.source[0][0] = next }
      })
    }
    const cover = value.format?.page_cover
    if (isNotionManagedAsset(cover)) {
      targets.push({
        source: cover,
        apply: next => { value.format.page_cover = next }
      })
    }

    for (const target of targets) {
      try {
        const mirrored = await mirrorOneImage(target.source, { ...value, id: value.id || blockId }, config)
        target.apply(mirrored.publicUrl)
        manifest.push({ blockId, ...mirrored })
      } catch (error) {
        failures.push({
          blockId,
          sourceUrl: target.source,
          error: error instanceof Error ? error.message : 'Image mirror failed'
        })
      }
    }
  }

  if (failures.length && options.failOnError !== false) {
    const error = new Error(`${failures.length} Notion image(s) could not be mirrored`)
    error.failures = failures
    throw error
  }

  return { recordMap: result, manifest, failures }
}
