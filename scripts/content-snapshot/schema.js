#!/usr/bin/env node

const crypto = require('crypto')

const TYPES = ['article', 'course-note', 'reading-note', 'project', 'page']
const VISIBILITIES = ['private', 'public', 'shared']
const STATUSES = ['draft', 'published', 'archived']
const SOURCES = ['notion', 'markdown', 'manual', 'course-worker']
const ACCESS_MODES = ['public', 'password', 'private']
const CATEGORIES = ['法律之上', '法与算法', '遇事不决', '秘密花园']
const SLUG_PATTERN = /^[a-z0-9]+(?:[-_/][a-z0-9]+)*$/

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

function checksumPayload(snapshot) {
  const { checksum, ...payload } = snapshot
  return payload
}

function computeSnapshotChecksum(snapshot) {
  return crypto
    .createHash('sha256')
    .update(stableStringify(checksumPayload(snapshot)))
    .digest('hex')
}

function validateRequiredString(snapshot, field, errors) {
  if (typeof snapshot[field] !== 'string' || snapshot[field].trim() === '') {
    errors.push(`${field} must be a non-empty string`)
  }
}

function validateStringArray(snapshot, field, errors) {
  if (!Array.isArray(snapshot[field])) {
    errors.push(`${field} must be an array`)
    return
  }

  snapshot[field].forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(`${field}[${index}] must be a non-empty string`)
    }
  })
}

function validateAssets(snapshot, errors) {
  if (!Array.isArray(snapshot.assets)) {
    errors.push('assets must be an array')
    return
  }

  snapshot.assets.forEach((asset, index) => {
    if (!isPlainObject(asset)) {
      errors.push(`assets[${index}] must be an object`)
      return
    }

    if (typeof asset.url !== 'string' || asset.url.trim() === '') {
      errors.push(`assets[${index}].url must be a non-empty string`)
    }

    if (asset.alt !== undefined && typeof asset.alt !== 'string') {
      errors.push(`assets[${index}].alt must be a string when present`)
    }
  })
}

function validateEnum(snapshot, field, allowed, errors) {
  if (!allowed.includes(snapshot[field])) {
    errors.push(`${field} must be one of: ${allowed.join(', ')}`)
  }
}

function validateOptionalString(snapshot, field, errors) {
  if (snapshot[field] !== undefined && typeof snapshot[field] !== 'string') {
    errors.push(`${field} must be a string when present`)
  }
}

function validateBoolean(value, field, errors) {
  if (typeof value !== 'boolean') {
    errors.push(`${field} must be a boolean`)
  }
}

function validateDateString(value, field, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field} must be a non-empty date string`)
    return
  }

  if (Number.isNaN(Date.parse(value))) {
    errors.push(`${field} must be an ISO-compatible date string`)
  }
}

function validateAccess(snapshot, errors) {
  if (!isPlainObject(snapshot.access)) {
    errors.push('access must be an object')
    return
  }

  validateEnum(snapshot.access, 'mode', ACCESS_MODES, errors)

  if (
    snapshot.access.password !== undefined &&
    typeof snapshot.access.password !== 'string'
  ) {
    errors.push('access.password must be a string when present')
  }

  if (snapshot.access.expiresAt !== undefined) {
    validateDateString(snapshot.access.expiresAt, 'access.expiresAt', errors)
  }

  if (
    snapshot.access.mode === 'password' &&
    (!snapshot.access.password || snapshot.access.password.trim() === '')
  ) {
    errors.push('access.password is required when access.mode is password')
  }

  validateBoolean(snapshot.access.allowIndexing, 'access.allowIndexing', errors)
  validateBoolean(snapshot.access.allowRss, 'access.allowRss', errors)
  validateBoolean(snapshot.access.allowSitemap, 'access.allowSitemap', errors)
}

function validateDisplay(snapshot, errors) {
  if (!isPlainObject(snapshot.display)) {
    errors.push('display must be an object')
    return
  }

  validateEnum(snapshot.display, 'category', CATEGORIES, errors)
  validateStringArray(snapshot.display, 'tags', errors)

  if (snapshot.display.pinned !== undefined) {
    validateBoolean(snapshot.display.pinned, 'display.pinned', errors)
  }

  if (snapshot.display.showInRecent !== undefined) {
    validateBoolean(
      snapshot.display.showInRecent,
      'display.showInRecent',
      errors
    )
  }
}

function validateCourse(snapshot, errors) {
  if (snapshot.course === undefined) return

  if (!isPlainObject(snapshot.course)) {
    errors.push('course must be an object when present')
    return
  }

  ;['name', 'lesson', 'teacher', 'date'].forEach(field => {
    if (
      snapshot.course[field] !== undefined &&
      typeof snapshot.course[field] !== 'string'
    ) {
      errors.push(`course.${field} must be a string when present`)
    }
  })

  if (snapshot.course.date !== undefined) {
    validateDateString(snapshot.course.date, 'course.date', errors)
  }
}

function validateFolder(snapshot, errors) {
  if (snapshot.folder === undefined) return

  if (!isPlainObject(snapshot.folder)) {
    errors.push('folder must be an object when present')
    return
  }

  if (!Array.isArray(snapshot.folder.path)) {
    errors.push('folder.path must be an array')
    return
  }

  snapshot.folder.path.forEach((segment, index) => {
    if (typeof segment !== 'string' || segment.trim() === '') {
      errors.push(`folder.path[${index}] must be a non-empty string`)
    }
  })
}

function validateContentSnapshot(snapshot) {
  const errors = []

  if (!isPlainObject(snapshot)) {
    return { valid: false, errors: ['snapshot must be an object'] }
  }

  validateRequiredString(snapshot, 'id', errors)
  validateRequiredString(snapshot, 'slug', errors)
  validateRequiredString(snapshot, 'title', errors)
  validateRequiredString(snapshot, 'updatedAt', errors)
  validateRequiredString(snapshot, 'bodyMarkdown', errors)

  validateEnum(snapshot, 'type', TYPES, errors)
  validateEnum(snapshot, 'visibility', VISIBILITIES, errors)
  validateEnum(snapshot, 'status', STATUSES, errors)
  validateEnum(snapshot, 'source', SOURCES, errors)

  validateStringArray(snapshot, 'tags', errors)
  validateAccess(snapshot, errors)
  validateDisplay(snapshot, errors)
  validateCourse(snapshot, errors)
  validateFolder(snapshot, errors)
  validateAssets(snapshot, errors)
  validateOptionalString(snapshot, 'summary', errors)
  validateOptionalString(snapshot, 'category', errors)
  validateOptionalString(snapshot, 'date', errors)
  validateOptionalString(snapshot, 'sourceId', errors)

  if (typeof snapshot.slug === 'string' && !SLUG_PATTERN.test(snapshot.slug)) {
    errors.push('slug must contain lowercase letters, numbers, hyphen, slash or underscore')
  }

  if (
    typeof snapshot.updatedAt === 'string' &&
    Number.isNaN(Date.parse(snapshot.updatedAt))
  ) {
    errors.push('updatedAt must be an ISO-compatible date string')
  }

  if (
    snapshot.date !== undefined &&
    typeof snapshot.date === 'string' &&
    Number.isNaN(Date.parse(snapshot.date))
  ) {
    errors.push('date must be an ISO-compatible date string when present')
  }

  if (
    typeof snapshot.checksum !== 'string' ||
    snapshot.checksum.trim() === ''
  ) {
    errors.push('checksum must be a non-empty string')
  } else {
    const expectedChecksum = computeSnapshotChecksum(snapshot)
    if (snapshot.checksum !== expectedChecksum) {
      errors.push('checksum does not match snapshot content')
    }
  }

  return { valid: errors.length === 0, errors }
}

function normalizeSnapshot(snapshot) {
  const normalized = {
    ...snapshot,
    tags: [...snapshot.tags],
    assets: snapshot.assets.map(asset => ({ ...asset })),
    access: { ...snapshot.access },
    display: {
      ...snapshot.display,
      tags: [...snapshot.display.tags]
    }
  }

  if (snapshot.course) {
    normalized.course = { ...snapshot.course }
  }

  if (snapshot.folder) {
    normalized.folder = { path: [...snapshot.folder.path] }
  }

  normalized.checksum = computeSnapshotChecksum(normalized)
  return normalized
}

function toPublicMetadata(snapshot) {
  const {
    bodyMarkdown,
    checksum,
    sourceId,
    ...metadata
  } = snapshot

  return {
    ...metadata,
    checksum,
    hasBody: Boolean(bodyMarkdown && bodyMarkdown.trim())
  }
}

module.exports = {
  TYPES,
  VISIBILITIES,
  STATUSES,
  SOURCES,
  ACCESS_MODES,
  CATEGORIES,
  computeSnapshotChecksum,
  normalizeSnapshot,
  stableStringify,
  toPublicMetadata,
  validateContentSnapshot
}
