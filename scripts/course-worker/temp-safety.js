const fs = require('fs')
const os = require('os')
const path = require('path')

const TEMP_ROOT = process.env.COURSE_TEMP_ROOT || path.join(os.tmpdir(), 'law-tech-course')
const JOB_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{5,80}$/

function assertSafeJobId(jobId) {
  if (!JOB_ID_PATTERN.test(String(jobId || ''))) {
    throw new Error('Unsafe course worker job id')
  }
}

function ensureTempRoot(root = TEMP_ROOT) {
  fs.mkdirSync(root, { recursive: true })
  return fs.realpathSync(root)
}

function createJobTempDir(jobId, root = TEMP_ROOT) {
  assertSafeJobId(jobId)
  const realRoot = ensureTempRoot(root)
  const dir = path.join(realRoot, jobId)
  fs.mkdirSync(dir, { recursive: true })
  const realDir = fs.realpathSync(dir)
  if (!realDir.startsWith(`${realRoot}${path.sep}`)) {
    throw new Error('Course worker temp path escaped root')
  }
  return realDir
}

function removeJobTempDir(jobId, root = TEMP_ROOT) {
  assertSafeJobId(jobId)
  const realRoot = ensureTempRoot(root)
  const dir = path.join(realRoot, jobId)
  if (!fs.existsSync(dir)) return { removed: false, path: dir }
  const realDir = fs.realpathSync(dir)
  if (!realDir.startsWith(`${realRoot}${path.sep}`)) {
    throw new Error('Refusing to remove path outside course temp root')
  }
  fs.rmSync(realDir, { recursive: true, force: true })
  return { removed: true, path: realDir }
}

function cleanupExpiredTempDirs({ root = TEMP_ROOT, ttlMs = 24 * 60 * 60 * 1000 } = {}) {
  const realRoot = ensureTempRoot(root)
  const now = Date.now()
  const removed = []
  for (const entry of fs.readdirSync(realRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !JOB_ID_PATTERN.test(entry.name)) continue
    const target = path.join(realRoot, entry.name)
    const stat = fs.statSync(target)
    if (now - stat.mtimeMs < ttlMs) continue
    removed.push(removeJobTempDir(entry.name, realRoot))
  }
  return removed
}

module.exports = {
  TEMP_ROOT,
  assertSafeJobId,
  cleanupExpiredTempDirs,
  createJobTempDir,
  removeJobTempDir
}
