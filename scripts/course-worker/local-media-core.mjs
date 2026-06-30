import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  spawnSync
} from 'node:child_process'

const MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.m4v',
  '.mov',
  '.mkv',
  '.ts'
])

const SKIP_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  'Library',
  'Photos Library.photoslibrary'
])

export function parseProbeJson(
  raw,
  filePath = ''
) {
  const data =
    typeof raw === 'string'
      ? JSON.parse(raw)
      : raw

  const streams = (
    Array.isArray(data?.streams)
      ? data.streams
      : []
  ).map(stream => ({
    codecType:
      String(stream.codec_type || ''),
    codecName:
      String(stream.codec_name || '')
  }))

  return {
    filePath:
      path.resolve(filePath || '.'),
    durationSeconds:
      Number(data?.format?.duration || 0),
    bytes:
      Number(data?.format?.size || 0),
    streams,
    hasAudio:
      streams.some(
        item => item.codecType === 'audio'
      ),
    hasVideo:
      streams.some(
        item => item.codecType === 'video'
      )
  }
}

export function validateMediaInfo(
  info,
  options = {}
) {
  const minimumSeconds =
    Number(options.minimumSeconds || 60)
  const minimumBytes =
    Number(
      options.minimumBytes ||
      10 * 1024 * 1024
    )

  const errors = []
  if (
    !Number.isFinite(info?.durationSeconds) ||
    info.durationSeconds < minimumSeconds
  ) {
    errors.push(
      `duration must be at least ${minimumSeconds}s`
    )
  }
  if (
    !Number.isFinite(info?.bytes) ||
    info.bytes < minimumBytes
  ) {
    errors.push(
      `media must be at least ${minimumBytes} bytes`
    )
  }
  if (!info?.hasAudio) {
    errors.push(
      'media must contain an audio stream'
    )
  }

  return {
    ok: errors.length === 0,
    errors
  }
}

export function probeMediaFile(
  filePath,
  options = {}
) {
  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) {
    const error = new Error(
      `Media file not found: ${resolved}`
    )
    error.code = 'MEDIA_NOT_FOUND'
    throw error
  }

  const command =
    options.ffprobe ||
    process.env.COURSE_FFPROBE ||
    'ffprobe'
  const result = spawnSync(
    command,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration,size:stream=codec_type,codec_name',
      '-of',
      'json',
      resolved
    ],
    {
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 16 * 1024 * 1024
    }
  )

  if (result.status !== 0) {
    const error = new Error(
      `ffprobe failed: ${
        String(result.stderr || '')
          .trim()
          .slice(-1200)
      }`
    )
    error.code = 'MEDIA_PROBE_FAILED'
    throw error
  }

  const info = parseProbeJson(
    result.stdout,
    resolved
  )
  if (!info.bytes) {
    info.bytes =
      fs.statSync(resolved).size
  }

  const validation =
    validateMediaInfo(
      info,
      options
    )
  if (!validation.ok) {
    const error = new Error(
      `Invalid media: ${validation.errors.join('; ')}`
    )
    error.code = 'MEDIA_INVALID'
    error.details = validation.errors
    throw error
  }
  return info
}

function visitFiles(
  root,
  options,
  result,
  depth = 0
) {
  if (
    depth >
    Number(options.maxDepth || 5)
  ) {
    return
  }

  let entries = []
  try {
    entries = fs.readdirSync(
      root,
      {
        withFileTypes: true
      }
    )
  } catch {
    return
  }

  for (const entry of entries) {
    const child = path.join(
      root,
      entry.name
    )
    if (entry.isSymbolicLink()) continue

    if (entry.isDirectory()) {
      if (
        SKIP_DIRECTORIES.has(entry.name)
      ) {
        continue
      }
      visitFiles(
        child,
        options,
        result,
        depth + 1
      )
      continue
    }

    if (!entry.isFile()) continue
    if (
      !MEDIA_EXTENSIONS.has(
        path.extname(entry.name)
          .toLowerCase()
      )
    ) {
      continue
    }

    try {
      const stat = fs.statSync(child)
      if (
        stat.size <
        Number(
          options.minimumBytes ||
          200 * 1024 * 1024
        )
      ) {
        continue
      }
      if (
        options.modifiedAfterMs &&
        stat.mtimeMs <
        options.modifiedAfterMs
      ) {
        continue
      }
      result.push({
        filePath: child,
        bytes: stat.size,
        mtimeMs: stat.mtimeMs
      })
    } catch {
      // File disappeared during scan.
    }
  }
}

export function defaultMediaRoots(
  homeDir = os.homedir()
) {
  return [
    path.join(
      homeDir,
      '.law-tech-course-worker'
    ),
    path.join(homeDir, 'Downloads'),
    path.join(homeDir, 'Movies'),
    path.join(homeDir, 'Desktop')
  ]
}

export function discoverMediaFiles(
  roots = defaultMediaRoots(),
  options = {}
) {
  const result = []
  const modifiedAfterMs =
    options.modifiedAfterMs ||
    Date.now() -
      Number(options.recentDays || 60) *
        24 * 60 * 60 * 1000

  for (const root of roots) {
    const resolved = path.resolve(root)
    if (!fs.existsSync(resolved)) {
      continue
    }
    visitFiles(
      resolved,
      {
        ...options,
        modifiedAfterMs
      },
      result
    )
  }

  return result
    .sort((left, right) => {
      if (
        right.mtimeMs !== left.mtimeMs
      ) {
        return right.mtimeMs -
          left.mtimeMs
      }
      return right.bytes - left.bytes
    })
    .slice(
      0,
      Number(options.maximumFiles || 40)
    )
}

export function rankMediaCandidates(
  candidates,
  options = {}
) {
  const expectedDuration =
    Number(
      options.expectedDurationSeconds ||
      10_774
    )

  return [...(candidates || [])]
    .map(candidate => ({
      ...candidate,
      durationDistance:
        Math.abs(
          Number(
            candidate.durationSeconds || 0
          ) -
          expectedDuration
        )
    }))
    .sort((left, right) => {
      if (
        left.durationDistance !==
        right.durationDistance
      ) {
        return (
          left.durationDistance -
          right.durationDistance
        )
      }
      return (
        Number(right.mtimeMs || 0) -
        Number(left.mtimeMs || 0)
      )
    })
}

export function selectAutomaticMedia(
  candidates,
  options = {}
) {
  const tolerance =
    Number(
      options.toleranceSeconds ||
      20 * 60
    )
  const ranked = rankMediaCandidates(
    candidates,
    options
  )
  const eligible = ranked.filter(
    candidate =>
      candidate.durationDistance <=
      tolerance
  )

  if (eligible.length === 1) {
    return eligible[0]
  }

  const error = new Error(
    eligible.length
      ? `Automatic media selection matched ${eligible.length} files`
      : 'Automatic media selection found no sufficiently close recording'
  )
  error.code =
    eligible.length
      ? 'MEDIA_AMBIGUOUS'
      : 'MEDIA_NOT_FOUND'
  error.candidates = ranked.slice(0, 10)
  throw error
}

export function discoverAndProbeMedia(
  options = {}
) {
  const roots =
    options.roots?.length
      ? options.roots
      : defaultMediaRoots(
          options.homeDir
        )

  const files = discoverMediaFiles(
    roots,
    options
  )
  const candidates = []

  for (const file of files) {
    try {
      candidates.push({
        ...file,
        ...probeMediaFile(
          file.filePath,
          options
        )
      })
    } catch {
      // Ignore corrupt or unsupported files.
    }
  }

  return rankMediaCandidates(
    candidates,
    options
  )
}

export async function sha256File(
  filePath
) {
  return new Promise(
    (resolve, reject) => {
      const hash =
        crypto.createHash('sha256')
      const stream =
        fs.createReadStream(filePath)
      stream.on(
        'data',
        chunk => hash.update(chunk)
      )
      stream.once('error', reject)
      stream.once(
        'end',
        () =>
          resolve(hash.digest('hex'))
      )
    }
  )
}

export function seedMediaFile(
  sourcePath,
  targetPath
) {
  const source =
    path.resolve(sourcePath)
  const target =
    path.resolve(targetPath)

  if (source === target) {
    return {
      mode: 'existing',
      source,
      target
    }
  }

  fs.mkdirSync(
    path.dirname(target),
    {
      recursive: true
    }
  )
  const temporary =
    `${target}.seed.part`
  fs.rmSync(
    temporary,
    {
      force: true
    }
  )
  fs.rmSync(
    target,
    {
      force: true
    }
  )

  let mode = 'hardlink'
  try {
    fs.linkSync(
      source,
      temporary
    )
  } catch {
    mode = 'copy'
    fs.copyFileSync(
      source,
      temporary,
      fs.constants.COPYFILE_FICLONE
    )
  }

  fs.renameSync(
    temporary,
    target
  )
  return {
    mode,
    source,
    target
  }
}
