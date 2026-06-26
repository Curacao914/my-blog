const fs = require('fs')
const os = require('os')
const path = require('path')

const {
  createJobTempDir,
  removeJobTempDir
} = require('../../scripts/course-worker/temp-safety')

describe('course worker temp safety', () => {
  let root

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'law-tech-course-test-'))
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('creates and removes only validated job directories under the temp root', () => {
    const dir = createJobTempDir('job-safe-001', root)
    fs.writeFileSync(path.join(dir, 'marker.txt'), 'ok')

    expect(dir.startsWith(fs.realpathSync(root))).toBe(true)
    expect(fs.existsSync(dir)).toBe(true)

    const result = removeJobTempDir('job-safe-001', root)
    expect(result.removed).toBe(true)
    expect(fs.existsSync(dir)).toBe(false)
    expect(fs.existsSync(root)).toBe(true)
  })

  it('rejects path traversal job ids', () => {
    expect(() => createJobTempDir('../escape', root)).toThrow(/Unsafe/)
    expect(() => removeJobTempDir('../../escape', root)).toThrow(/Unsafe/)
  })
})
