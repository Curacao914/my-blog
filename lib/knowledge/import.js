import JSZip from 'jszip'

const MAX_ARCHIVE_FILES = 20
const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const textExtensions = new Set(['md', 'markdown', 'txt'])
const markdownExtensions = new Set(['md', 'markdown'])
const imageMimeByExtension = Object.freeze({
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
})
const unsafeExtensions = new Set(['svg', 'html', 'htm', 'js', 'mjs', 'cjs'])

function importError(message, code) {
  const error = new Error(message)
  error.status = 400
  error.code = code
  error.isKnowledgeImportError = true
  return error
}

function fileName(value) {
  return String(value || '').trim()
}

function extension(name) {
  const match = fileName(name).toLowerCase().match(/\.([^.\/\\]+)$/)
  return match?.[1] || ''
}

function titleFromMarkdown(markdown, name) {
  const heading = String(markdown || '').match(/^\s*#\s+(.+?)\s*#*\s*$/m)
  if (heading?.[1]) return heading[1].trim()

  const base = fileName(name)
    .replace(/^.*[\\/]/, '')
    .replace(/\.(?:md|markdown|txt)$/i, '')
    .trim()
  return base || '未命名知识'
}

export function parseKnowledgeText({ name, text } = {}) {
  const safeName = fileName(name)
  if (!textExtensions.has(extension(safeName))) {
    throw importError(
      'Only Markdown and TXT knowledge files are supported',
      'unsupported_text_type'
    )
  }

  const markdown = String(text ?? '').replace(/^\uFEFF/, '')
  return {
    markdown,
    title: titleFromMarkdown(markdown, safeName),
    assets: []
  }
}

function normalizedArchivePath(rawName) {
  const raw = fileName(rawName).replace(/\\/g, '/')
  if (
    !raw ||
    raw.startsWith('/') ||
    /^[a-z]:\//i.test(raw) ||
    raw.split('/').some(part => part === '..')
  ) {
    throw importError('ZIP contains an unsafe path', 'archive_unsafe_path')
  }

  const parts = raw.split('/').filter(part => part && part !== '.')
  if (!parts.length) {
    throw importError('ZIP contains an unsafe path', 'archive_unsafe_path')
  }
  return parts.join('/')
}

function assertNotSystemFile(path) {
  const parts = path.split('/')
  const lower = parts.map(part => part.toLowerCase())
  if (
    parts.some(part => part.startsWith('.')) ||
    lower.includes('__macosx') ||
    lower.includes('.ds_store') ||
    lower.includes('thumbs.db')
  ) {
    throw importError(
      'ZIP contains a hidden system file',
      'archive_system_file'
    )
  }
}

function encodePath(path) {
  return path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

function decodePath(path) {
  try {
    return path
      .split('/')
      .map(segment => decodeURIComponent(segment))
      .join('/')
  } catch {
    return path
  }
}

function splitDestination(destination) {
  const match = String(destination || '').match(/^([^?#]*)([?#].*)?$/)
  return {
    path: match?.[1] || '',
    suffix: match?.[2] || ''
  }
}

function isExternalDestination(destination) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(
    String(destination || '').trim()
  )
}

function canonicalRelativePath(value) {
  const raw = String(value || '').trim()
  if (!raw || isExternalDestination(raw)) return ''

  const parts = []
  for (const part of decodePath(raw).replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (!parts.length) return ''
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  return parts.join('/')
}

function resolveArchiveReference(mainPath, destination) {
  const raw = String(destination || '').trim()
  if (!raw || isExternalDestination(raw)) return null

  const { path: destinationPath, suffix } = splitDestination(raw)
  const baseParts = mainPath.split('/').slice(0, -1)
  const targetParts = decodePath(destinationPath)
    .replace(/\\/g, '/')
    .split('/')

  for (const part of targetParts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (!baseParts.length) return null
      baseParts.pop()
    } else {
      baseParts.push(part)
    }
  }

  if (!baseParts.length) return null
  return {
    path: baseParts.join('/'),
    destination: `${encodePath(baseParts.join('/'))}${suffix}`
  }
}

function replaceMarkdownImages(markdown, replacer) {
  return String(markdown || '').replace(
    /!\[([^\]]*)\]\(\s*(<[^>]+>|[^\s)]+)(\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g,
    (match, alt, wrappedDestination, title = '') => {
      const wrapped = wrappedDestination.startsWith('<') &&
        wrappedDestination.endsWith('>')
      const destination = wrapped
        ? wrappedDestination.slice(1, -1)
        : wrappedDestination
      const replacement = replacer({
        alt,
        destination,
        title,
        wrapped,
        match
      })
      if (!replacement) return match
      const nextDestination = replacement.destination
      const shouldWrap = replacement.wrapped === true ||
        (wrapped && replacement.wrapped !== false)
      return `![${alt}](${shouldWrap ? `<${nextDestination}>` : nextDestination}${title || ''})`
    }
  )
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }

  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    )
  }
  return btoa(binary)
}

async function archiveBytes(input) {
  if (input && typeof input.arrayBuffer === 'function') {
    return new Uint8Array(await input.arrayBuffer())
  }
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }
  throw importError('ZIP data is required', 'archive_required')
}

function chooseMainMarkdown(entries) {
  const markdown = entries.filter(entry =>
    markdownExtensions.has(extension(entry.path))
  )
  if (!markdown.length) {
    throw importError(
      'ZIP must contain at least one Markdown file',
      'archive_markdown_required'
    )
  }

  const rootIndex = markdown.find(entry => entry.path.toLowerCase() === 'index.md')
  const rootReadme = markdown.find(entry => entry.path.toLowerCase() === 'readme.md')
  const chosen = rootIndex || rootReadme || (
    markdown.length === 1
      ? markdown[0]
      : [...markdown].sort((left, right) => {
          const lengthDifference = left.path.length - right.path.length
          if (lengthDifference) return lengthDifference
          return left.path.localeCompare(right.path, 'en')
        })[0]
  )

  const ignored = markdown
    .filter(entry => entry !== chosen)
    .map(entry => entry.path)
  return {
    chosen,
    warning: ignored.length
      ? `已选择 ${chosen.path}；未合并其他 Markdown：${ignored.join('、')}`
      : ''
  }
}

export async function parseKnowledgeArchive(input) {
  let zip
  try {
    zip = await JSZip.loadAsync(await archiveBytes(input))
  } catch (error) {
    if (/encrypt/i.test(String(error?.message || ''))) {
      throw importError(
        'Encrypted ZIP archives are not supported',
        'archive_encrypted'
      )
    }
    if (error?.isKnowledgeImportError) throw error
    throw importError('Invalid ZIP archive', 'archive_invalid')
  }

  const files = Object.values(zip.files).filter(entry => !entry.dir)
  if (files.length > MAX_ARCHIVE_FILES) {
    throw importError(
      `ZIP may contain at most ${MAX_ARCHIVE_FILES} files`,
      'archive_file_limit'
    )
  }

  const entries = files.map(entry => {
    const originalPath = entry.unsafeOriginalName || entry.name
    const path = normalizedArchivePath(originalPath)
    assertNotSystemFile(path)
    const fileExtension = extension(path)
    if (unsafeExtensions.has(fileExtension)) {
      throw importError(
        `ZIP contains an unsafe file type: .${fileExtension}`,
        'archive_unsafe_type'
      )
    }
    return { entry, path, fileExtension }
  })

  const declaredSize = entries.reduce(
    (sum, item) => sum + Number(item.entry?._data?.uncompressedSize || 0),
    0
  )
  if (declaredSize > MAX_ARCHIVE_BYTES) {
    throw importError(
      'Expanded ZIP content exceeds 8MB',
      'archive_size_limit'
    )
  }

  const expanded = new Map()
  let expandedSize = 0
  for (const item of entries) {
    const bytes = await item.entry.async('uint8array')
    expandedSize += bytes.byteLength
    if (expandedSize > MAX_ARCHIVE_BYTES) {
      throw importError(
        'Expanded ZIP content exceeds 8MB',
        'archive_size_limit'
      )
    }
    if (
      imageMimeByExtension[item.fileExtension] &&
      bytes.byteLength > MAX_IMAGE_BYTES
    ) {
      throw importError(
        `ZIP image exceeds 2MB: ${item.path}`,
        'archive_image_limit'
      )
    }
    expanded.set(item.path, bytes)
  }

  const { chosen, warning } = chooseMainMarkdown(entries)
  const sourceMarkdown = await chosen.entry.async('string')
  const entryByPath = new Map(entries.map(item => [item.path, item]))
  const referenced = new Map()
  const markdown = replaceMarkdownImages(sourceMarkdown, image => {
    const resolved = resolveArchiveReference(chosen.path, image.destination)
    if (!resolved) return null

    const item = entryByPath.get(resolved.path)
    if (!item || !imageMimeByExtension[item.fileExtension]) return null
    if (!referenced.has(item.path)) {
      referenced.set(item.path, {
        item,
        altText: image.alt.trim()
      })
    }
    return {
      destination: resolved.destination,
      wrapped: resolved.destination.includes('%20')
    }
  })

  const assets = Array.from(referenced.values(), ({ item, altText }) => {
    const bytes = expanded.get(item.path)
    const mimeType = imageMimeByExtension[item.fileExtension]
    return {
      path: item.path,
      name: item.path.split('/').pop(),
      mimeType,
      sizeBytes: bytes.byteLength,
      altText,
      dataUrl: `data:${mimeType};base64,${bytesToBase64(bytes)}`
    }
  })

  return {
    markdown,
    title: titleFromMarkdown(markdown, chosen.path),
    assets,
    ...(warning ? { warning } : {})
  }
}

export async function parseKnowledgeFile(file) {
  const name = fileName(file?.name)
  if (extension(name) === 'zip') return parseKnowledgeArchive(file)
  if (!file || typeof file.text !== 'function') {
    throw importError('A readable knowledge file is required', 'file_required')
  }
  return parseKnowledgeText({
    name,
    text: await file.text()
  })
}

export function rewriteKnowledgeAssetReferences(markdown, uploads = []) {
  const byPath = new Map()
  for (const upload of Array.isArray(uploads) ? uploads : []) {
    const path = fileName(upload?.path || upload?.relativePath)
    const id = fileName(upload?.id)
    const canonicalPath = canonicalRelativePath(path)
    if (canonicalPath && id) byPath.set(canonicalPath, id)
  }

  return replaceMarkdownImages(markdown, image => {
    if (isExternalDestination(image.destination)) return null
    const id = byPath.get(canonicalRelativePath(image.destination))
    if (!id) return null
    return {
      destination: `/api/knowledge/assets/${id}`,
      wrapped: false
    }
  })
}
