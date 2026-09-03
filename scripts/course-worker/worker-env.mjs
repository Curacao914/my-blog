import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_DIR = path.dirname(
  fileURLToPath(import.meta.url)
)
export const COURSE_WORKER_REPO_ROOT =
  path.resolve(MODULE_DIR, '../..')

const COMMON_BIN_DIRS = [
  '/opt/homebrew/bin',
  '/usr/local/bin'
]

function executable(filePath) {
  if (!filePath) return false
  try {
    fs.accessSync(filePath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

function nonEmptyDirectory(directory) {
  try {
    return (
      fs.statSync(directory).isDirectory() &&
      fs.readdirSync(directory).length > 0
    )
  } catch {
    return false
  }
}

function unquote(value) {
  const text = String(value || '').trim()
  if (
    text.length >= 2 &&
    text.startsWith('"') &&
    text.endsWith('"')
  ) {
    return text
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
  if (
    text.length >= 2 &&
    text.startsWith("'") &&
    text.endsWith("'")
  ) {
    return text.slice(1, -1)
  }
  return text
}

export function parseEnvText(raw = '') {
  const result = {}
  for (const sourceLine of String(raw).split(/\r?\n/)) {
    let line = sourceLine.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) {
      line = line.slice('export '.length).trim()
    }
    const index = line.indexOf('=')
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue
    }
    result[key] = unquote(line.slice(index + 1))
  }
  return result
}

export function findWorkerExecutable(
  name,
  options = {}
) {
  const env = options.env || process.env
  const candidates = [
    ...(options.candidates || [])
  ]
  const pathValue = String(
    options.pathValue ?? env.PATH ?? ''
  )
  for (const directory of pathValue.split(path.delimiter)) {
    if (directory) {
      candidates.push(path.join(directory, name))
    }
  }
  for (const directory of COMMON_BIN_DIRS) {
    candidates.push(path.join(directory, name))
  }
  return candidates.find(executable) || ''
}

function loadFile(filePath) {
  try {
    return parseEnvText(
      fs.readFileSync(filePath, 'utf8')
    )
  } catch {
    return {}
  }
}

export function buildCourseWorkerEnvironment(
  options = {}
) {
  const repoRoot = path.resolve(
    options.repoRoot || COURSE_WORKER_REPO_ROOT
  )
  const homeDir = path.resolve(
    options.homeDir || os.homedir()
  )
  const baseEnv = {
    ...(options.baseEnv || process.env)
  }
  const shellKeys = new Set(
    Object.keys(baseEnv)
  )
  const env = {
    ...baseEnv
  }
  const files = [
    path.join(repoRoot, '.env.local'),
    path.join(
      repoRoot,
      '.env.course-worker.local'
    )
  ]
  const loadedFiles = []

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue
    loadedFiles.push(filePath)
    const values = loadFile(filePath)
    for (const [key, value] of Object.entries(values)) {
      if (!shellKeys.has(key)) {
        env[key] = value
      }
    }
  }

  const pathParts = String(env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean)
  for (const directory of [...COMMON_BIN_DIRS].reverse()) {
    if (
      fs.existsSync(directory) &&
      !pathParts.includes(directory)
    ) {
      pathParts.unshift(directory)
    }
  }
  env.PATH = pathParts.join(path.delimiter)

  const venvPython = path.join(
    repoRoot,
    '.venv-course-worker',
    'bin',
    'python'
  )
  if (!env.COURSE_PYTHON && executable(venvPython)) {
    env.COURSE_PYTHON = venvPython
  }

  const chrome = [
    env.COURSE_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].find(executable)
  if (!env.COURSE_CHROME_PATH && chrome) {
    env.COURSE_CHROME_PATH = chrome
  }

  const profileCandidates = [
    env.COURSE_BROWSER_PROFILE_DIR,
    path.join(
      homeDir,
      '.law-tech-course-browser-profile'
    ),
    path.join(
      homeDir,
      '.law-tech-course-worker',
      'browser-profile'
    )
  ].filter(Boolean)
  const profileDir = profileCandidates.find(
    nonEmptyDirectory
  )
  if (
    !env.COURSE_BROWSER_PROFILE_DIR &&
    profileDir
  ) {
    env.COURSE_BROWSER_PROFILE_DIR =
      profileDir
  }

  return {
    env,
    repoRoot,
    loadedFiles,
    detected: {
      python: env.COURSE_PYTHON || '',
      chrome: env.COURSE_CHROME_PATH || '',
      browserProfile:
        env.COURSE_BROWSER_PROFILE_DIR || ''
    }
  }
}

let cached = null

export function loadCourseWorkerEnvironment(
  options = {}
) {
  if (cached && !options.force) return cached
  const built =
    buildCourseWorkerEnvironment(options)
  Object.assign(process.env, built.env)
  cached = built
  return built
}

loadCourseWorkerEnvironment()
