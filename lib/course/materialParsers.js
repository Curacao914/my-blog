import JSZip from 'jszip'

import { extractPptxTextFromBuffer } from './pptxText'
import { cleanText, inferLessonOrder, parseSrtText, safeName } from './textpack'

const SUPPORTED_EXTENSIONS = ['srt', 'pptx', 'docx', 'txt', 'md', 'markdown']
const LEGACY_EXTENSIONS = {
  ppt: '旧版 PPT 请先另存为 PPTX。',
  doc: '旧版 Word 文档请先另存为 DOCX。'
}

const SOURCE_FILE_LIMITS = {
  srt: 20 * 1024 * 1024,
  txt: 20 * 1024 * 1024,
  md: 20 * 1024 * 1024,
  markdown: 20 * 1024 * 1024,
  docx: 80 * 1024 * 1024,
  pptx: 100 * 1024 * 1024
}

function extensionFromName(fileName = '') {
  return String(fileName).split('.').pop()?.toLowerCase() || ''
}

function looksGarbled(text) {
  if (!text) return false
  const replacement = (text.match(/\uFFFD/g) || []).length
  const controls = (text.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) || []).length
  return replacement > 0 || controls / Math.max(text.length, 1) > 0.02
}

function decodeUtf16(buffer, littleEndian = true) {
  const bytes = new Uint8Array(buffer)
  const chunks = []
  const values = []
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    values.push(littleEndian ? bytes[index] | (bytes[index + 1] << 8) : (bytes[index] << 8) | bytes[index + 1])
    if (values.length >= 8192) chunks.push(String.fromCharCode(...values.splice(0)))
  }
  if (values.length) chunks.push(String.fromCharCode(...values))
  return chunks.join('')
}

export function decodeTextBuffer(buffer, fileName = 'text.txt') {
  const bytes = new Uint8Array(buffer)
  if (!bytes.length) throw new Error(`${fileName} 是空文件。`)

  let text = ''
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    text = new TextDecoder('utf-8').decode(bytes.slice(3))
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    text = decodeUtf16(bytes.slice(2).buffer, true)
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    text = decodeUtf16(bytes.slice(2).buffer, false)
  } else {
    text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (looksGarbled(text)) {
      try {
        const chineseText = new TextDecoder('gb18030', { fatal: false }).decode(bytes)
        if (!looksGarbled(chineseText)) text = chineseText
      } catch {
        // Some browsers do not expose gb18030; the clear error below remains actionable.
      }
    }
  }

  text = cleanText(text)
  if (!text) throw new Error(`${fileName} 没有可用文字。`)
  if (looksGarbled(text)) throw new Error(`${fileName} 编码无法可靠识别，请另存为 UTF-8 后再导入。`)
  return text
}

function xmlText(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function extractDocxParagraphs(xml) {
  const blocks = []
  const blockRegex = /<w:(p|tbl)[\s\S]*?<\/w:\1>/g
  let match
  while ((match = blockRegex.exec(xml))) {
    const block = match[0]
    const texts = [...block.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map(item => xmlText(item[1]).trim())
      .filter(Boolean)
    if (!texts.length) continue
    const value = texts.join(match[1] === 'tbl' ? ' | ' : '')
    if (/<w:tbl/.test(block)) blocks.push(`| ${value} |`)
    else if (/<w:pStyle[^>]+w:val="Heading1"/.test(block)) blocks.push(`# ${value}`)
    else if (/<w:pStyle[^>]+w:val="Heading2"/.test(block)) blocks.push(`## ${value}`)
    else blocks.push(value)
  }
  return blocks
}

export async function parseDocxBuffer(buffer, fileName = 'document.docx') {
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')?.async('text')
  if (!documentXml) throw new Error(`${fileName} 不是可读取的 DOCX。`)
  if (documentXml.length > 12 * 1024 * 1024) throw new Error(`${fileName} 解压后的正文过大，请拆分后再导入。`)
  const blocks = extractDocxParagraphs(documentXml)
  const hasImages = Object.keys(zip.files).some(name => /^word\/media\//.test(name))
  const text = cleanText(blocks.join('\n\n'))
  if (!text) throw new Error(`${fileName} 没有提取到可用文字。`)
  return {
    title: safeName(fileName.replace(/\.docx$/i, ''), '文档'),
    text,
    paragraphCount: blocks.length,
    warnings: hasImages ? ['文档中包含图片，图片内文字尚未识别。'] : []
  }
}

function markdownStats(text) {
  return {
    headingCount: (text.match(/^#{1,6}\s+/gm) || []).length,
    tableCount: (text.match(/^\|.*\|$/gm) || []).length,
    codeBlockCount: (text.match(/```/g) || []).length / 2
  }
}

export async function parseCourseMaterialFile(file, role = '') {
  const ext = extensionFromName(file.name)
  if (LEGACY_EXTENSIONS[ext]) throw new Error(LEGACY_EXTENSIONS[ext])
  if (!SUPPORTED_EXTENSIONS.includes(ext)) throw new Error(`${file.name} 暂不支持。`)
  const maxBytes = SOURCE_FILE_LIMITS[ext] || 20 * 1024 * 1024
  if (Number(file.size || 0) > maxBytes) {
    throw new Error(`${file.name} 超过 ${Math.round(maxBytes / 1024 / 1024)} MB，请拆分或压缩后再导入。`)
  }

  const buffer = await file.arrayBuffer()
  const sourceFile = safeName(file.name)
  const lessonOrder = inferLessonOrder(file.name, 1)

  if (ext === 'srt') {
    const text = decodeTextBuffer(buffer, file.name)
    const parsed = parseSrtText(text, file.name)
    return {
      kind: 'transcript',
      role: role || 'transcript',
      lessonOrder,
      title: safeName(file.name.replace(/\.[^.]+$/, ''), `第 ${lessonOrder} 课`),
      sourceFile,
      text: parsed.text,
      charCount: parsed.text.length,
      lineCount: parsed.lineCount,
      sourceMap: parsed.sourceMap,
      warnings: parsed.warnings
    }
  }

  if (ext === 'pptx') {
    const deck = await extractPptxTextFromBuffer(buffer, file.name)
    return {
      kind: 'deck',
      role: role || 'slides',
      lessonOrder,
      ...deck,
      sourceFile,
      text: deck.markdown,
      charCount: deck.markdown.length
    }
  }

  if (ext === 'docx') {
    const doc = await parseDocxBuffer(buffer, file.name)
    return {
      kind: 'document',
      role: role || 'handout',
      lessonOrder,
      sourceFile,
      ...doc,
      charCount: doc.text.length
    }
  }

  const text = decodeTextBuffer(buffer, file.name)
  const isMarkdown = ext === 'md' || ext === 'markdown'
  return {
    kind: isMarkdown ? 'markdown' : 'document',
    role: role || (isMarkdown ? 'existing_note' : 'supplement'),
    lessonOrder,
    title: safeName(file.name.replace(/\.[^.]+$/, ''), '补充材料'),
    sourceFile,
    text,
    charCount: text.length,
    paragraphCount: text.split(/\n\s*\n/).filter(Boolean).length,
    markdown: isMarkdown ? text : '',
    markdownStats: isMarkdown ? markdownStats(text) : null,
    warnings: []
  }
}

export async function parseCourseMaterialFiles(files = [], roles = {}) {
  const materials = []
  const warnings = []
  for (const file of files) {
    try {
      const key = `${file.name}-${file.size}-${file.lastModified || 0}`
      materials.push(await parseCourseMaterialFile(file, roles[key] || roles[file.name] || ''))
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `${file.name} 解析失败。`)
    }
  }
  return { materials, warnings }
}

export function materialsToTextPackInput({ materials, courseName, teacher }) {
  const isDeck = item => item.kind === 'deck' || item.kind === 'slides' || item.role === 'slides'
  const isTranscript = item => item.kind === 'transcript' || item.role === 'transcript'
  const groups = new Map()

  materials.forEach(material => {
    const order = Number(material.lessonOrder || 1)
    if (!groups.has(order)) groups.set(order, [])
    groups.get(order).push(material)
  })

  const lessons = []
  const warnings = []
  for (const [order, group] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const textMaterials = group.filter(item => !isDeck(item))
    if (!textMaterials.length) continue
    const explicitTranscripts = textMaterials.filter(isTranscript)
    const primary = explicitTranscripts.length ? explicitTranscripts : textMaterials
    const supporting = textMaterials.filter(item => !primary.includes(item))

    const transcriptLines = []
    const sourceMap = []
    primary.forEach((item, itemIndex) => {
      const sourceLines = cleanText(item.text).split('\n')
      if (primary.length > 1) {
        transcriptLines.push(`【${item.title || item.sourceFile || `资料 ${itemIndex + 1}`}】`)
        sourceMap.push({ line: transcriptLines.length, sourceLine: 0, file: item.sourceFile, role: item.role })
      }
      const originalMap = Array.isArray(item.sourceMap) ? item.sourceMap : []
      sourceLines.forEach((line, lineIndex) => {
        transcriptLines.push(line)
        const mapped = originalMap[lineIndex] || {}
        sourceMap.push({
          ...mapped,
          line: transcriptLines.length,
          sourceLine: mapped.sourceLine || lineIndex + 1,
          file: mapped.file || item.sourceFile,
          role: item.role
        })
      })
    })

    const first = primary[0]
    lessons.push({
      order,
      title: primary.length === 1 ? first.title : `第 ${order} 课`,
      sourceFile: primary.length === 1 ? first.sourceFile : `lesson-${String(order).padStart(2, '0')}-materials.txt`,
      transcript: transcriptLines.join('\n'),
      sourceMap,
      materials: supporting,
      warnings: primary.flatMap(item => item.warnings || [])
    })
  }

  const decks = materials.filter(isDeck).map(item => ({
    ...item,
    markdown: item.text,
    lessonOrder: Number(item.lessonOrder || 1)
  }))

  if (!lessons.length) warnings.push('没有识别到可作为课程正文的文字资料。')
  if (!materials.some(isTranscript) && lessons.length) {
    warnings.push('未识别到课堂转录，已将文档或笔记作为课程正文。')
  }

  return {
    course: { name: courseName, teacher },
    lessons,
    decks,
    warnings
  }
}
