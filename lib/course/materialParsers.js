import JSZip from 'jszip'

import { extractPptxTextFromBuffer } from './pptxText'
import { cleanText, inferLessonOrder, parseSrtText, safeName } from './textpack'

export const OCR_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff']
const SUPPORTED_EXTENSIONS = ['srt', 'pptx', 'docx', 'txt', 'md', 'markdown', ...OCR_EXTENSIONS]
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
  pptx: 100 * 1024 * 1024,
  pdf: 100 * 1024 * 1024,
  png: 30 * 1024 * 1024,
  jpg: 30 * 1024 * 1024,
  jpeg: 30 * 1024 * 1024,
  webp: 30 * 1024 * 1024,
  bmp: 30 * 1024 * 1024,
  tif: 60 * 1024 * 1024,
  tiff: 60 * 1024 * 1024
}

export function materialFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified || 0}`
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
    warnings: hasImages ? ['文档中包含图片；需要时可单独提交在线文字识别。'] : []
  }
}

function markdownStats(text) {
  return {
    headingCount: (text.match(/^#{1,6}\s+/gm) || []).length,
    tableCount: (text.match(/^\|.*\|$/gm) || []).length,
    codeBlockCount: (text.match(/```/g) || []).length / 2
  }
}

function roleForExtension(ext, role) {
  if (role) return role
  if (ext === 'srt') return 'transcript'
  if (ext === 'pptx') return 'slides'
  if (ext === 'docx' || ext === 'pdf') return 'handout'
  if (ext === 'md' || ext === 'markdown') return 'existing_note'
  return 'supplement'
}

export async function parseCourseMaterialFile(file, role = '') {
  const ext = extensionFromName(file.name)
  if (LEGACY_EXTENSIONS[ext]) throw new Error(LEGACY_EXTENSIONS[ext])
  if (!SUPPORTED_EXTENSIONS.includes(ext)) throw new Error(`${file.name} 暂不支持。`)
  const maxBytes = SOURCE_FILE_LIMITS[ext] || 20 * 1024 * 1024
  if (Number(file.size || 0) > maxBytes) {
    throw new Error(`${file.name} 超过 ${Math.round(maxBytes / 1024 / 1024)} MB，请拆分或压缩后再导入。`)
  }

  const sourceFile = safeName(file.name)
  const clientKey = materialFileKey(file)
  const lessonOrder = inferLessonOrder(file.name, 1)
  const resolvedRole = roleForExtension(ext, role)

  if (OCR_EXTENSIONS.includes(ext)) {
    return {
      kind: 'ocr',
      role: resolvedRole,
      lessonOrder,
      title: safeName(file.name.replace(/\.[^.]+$/, ''), '扫描资料'),
      sourceFile,
      clientKey,
      extension: ext,
      text: '',
      charCount: 0,
      ocrRequired: true,
      warnings: ['这份资料需要在线文字识别后才能导入。']
    }
  }

  const buffer = await file.arrayBuffer()
  if (ext === 'srt') {
    const text = decodeTextBuffer(buffer, file.name)
    const parsed = parseSrtText(text, file.name)
    return {
      kind: 'transcript',
      role: resolvedRole,
      lessonOrder,
      title: safeName(file.name.replace(/\.[^.]+$/, ''), `第 ${lessonOrder} 课`),
      sourceFile,
      clientKey,
      extension: ext,
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
      role: resolvedRole,
      lessonOrder,
      ...deck,
      sourceFile,
      clientKey,
      extension: ext,
      text: deck.markdown,
      charCount: deck.markdown.length
    }
  }

  if (ext === 'docx') {
    const doc = await parseDocxBuffer(buffer, file.name)
    return {
      kind: 'document',
      role: resolvedRole,
      lessonOrder,
      sourceFile,
      clientKey,
      extension: ext,
      ...doc,
      charCount: doc.text.length
    }
  }

  const text = decodeTextBuffer(buffer, file.name)
  const isMarkdown = ext === 'md' || ext === 'markdown'
  return {
    kind: isMarkdown ? 'markdown' : 'document',
    role: resolvedRole,
    lessonOrder,
    title: safeName(file.name.replace(/\.[^.]+$/, ''), '补充材料'),
    sourceFile,
    clientKey,
    extension: ext,
    text,
    charCount: text.length,
    paragraphCount: text.split(/\n\s*\n/).filter(Boolean).length,
    markdown: isMarkdown ? text : '',
    markdownStats: isMarkdown ? markdownStats(text) : null,
    warnings: []
  }
}

export async function parseCourseMaterialFiles(files = [], roles = {}, onProgress) {
  const materials = []
  const warnings = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    try {
      const key = materialFileKey(file)
      materials.push(await parseCourseMaterialFile(file, roles[key] || roles[file.name] || ''))
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : `${file.name} 解析失败。`)
    }
    onProgress?.({ current: index + 1, total: files.length, fileName: file.name })
  }
  if (!materials.length && warnings.length) throw new Error(warnings.join('；'))
  return { materials, warnings }
}

function normalizeHint(value = '') {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/课堂转录|转录|字幕|课件|讲义|补充材料|补充|笔记|修改版|最终版|final|slides?|transcript|notes?/gi, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function explicitLessonSignal(material) {
  const sample = `${material.sourceFile || ''} ${material.title || ''} ${String(material.text || '').slice(0, 400)}`.normalize('NFKC')
  const fullDate = sample.match(/(20\d{2})[年./_-]\s*(\d{1,2})[月./_-]\s*(\d{1,2})日?/) || sample.match(/(20\d{2})(\d{2})(\d{2})/)
  if (fullDate) return { key: `date-${fullDate[1]}-${String(fullDate[2]).padStart(2, '0')}-${String(fullDate[3]).padStart(2, '0')}`, title: `${fullDate[1]}-${String(fullDate[2]).padStart(2, '0')}-${String(fullDate[3]).padStart(2, '0')}`, confidence: 'high' }
  const monthDay = sample.match(/(?:^|\D)(\d{1,2})月\s*(\d{1,2})日/)
  if (monthDay) return { key: `date-md-${monthDay[1]}-${monthDay[2]}`, title: `${monthDay[1]}月${monthDay[2]}日`, confidence: 'medium' }
  const ordinal = sample.match(/第\s*(\d{1,3})\s*[讲课节周]/) || sample.match(/(?:lesson|lecture|class|session)[-_\s]*(\d{1,3})/i)
  if (ordinal) return { key: `lesson-${Number(ordinal[1])}`, title: `第 ${Number(ordinal[1])} 课`, confidence: 'high', order: Number(ordinal[1]) }
  return null
}

function tokenSimilarity(left = '', right = '') {
  const a = new Set(normalizeHint(left).split(' ').filter(token => token.length > 1))
  const b = new Set(normalizeHint(right).split(' ').filter(token => token.length > 1))
  if (!a.size || !b.size) return 0
  const common = [...a].filter(token => b.has(token)).length
  return common / Math.max(a.size, b.size)
}

export function suggestLessonGroups(materials = []) {
  const groups = []
  const assigned = []
  materials.forEach((material, index) => {
    const signal = explicitLessonSignal(material)
    let group = signal ? groups.find(item => item.key === signal.key) : null
    if (!group && signal) {
      group = { key: signal.key, title: signal.title, order: signal.order || groups.length + 1, confidence: signal.confidence, materialKeys: [] }
      groups.push(group)
    }
    if (!group) {
      const hint = normalizeHint(material.sourceFile || material.title)
      group = groups
        .map(item => ({ item, score: Math.max(...item.materialKeys.map(key => {
          const existing = assigned.find(candidate => candidate.clientKey === key)
          return tokenSimilarity(hint, existing?.sourceFile || existing?.title || '')
        }), 0) }))
        .sort((a, b) => b.score - a.score)[0]
      group = group?.score >= 0.6 ? group.item : null
    }
    if (!group) {
      const primaryNumber = groups.length + 1
      group = { key: `suggested-${primaryNumber}`, title: material.title || `课次 ${primaryNumber}`, order: primaryNumber, confidence: 'low', materialKeys: [] }
      groups.push(group)
    }
    group.materialKeys.push(material.clientKey)
    assigned.push({ ...material, lessonGroupId: group.key, lessonTitle: group.title, lessonOrder: group.order, groupingConfidence: group.confidence })
  })
  return {
    groups: groups.sort((a, b) => Number(a.order) - Number(b.order)).map((group, index) => ({ ...group, order: index + 1 })),
    materials: assigned.map(material => {
      const group = groups.find(item => item.key === material.lessonGroupId)
      return { ...material, lessonOrder: group?.order || material.lessonOrder, lessonTitle: group?.title || material.lessonTitle }
    })
  }
}

export function applyOcrResultToMaterial(material, result = {}) {
  const pages = Array.isArray(result.pages) ? result.pages : []
  const markdown = cleanText(result.markdown || pages.map(page => `## 第 ${page.page} 页\n\n${page.markdown || ''}`).join('\n\n'))
  const isDeck = material.role === 'slides' || material.extension === 'pptx'
  return {
    ...material,
    kind: isDeck ? 'deck' : 'document',
    text: markdown,
    markdown: isDeck ? markdown : material.markdown,
    charCount: markdown.length,
    slideCount: isDeck ? pages.length : material.slideCount,
    paragraphCount: isDeck ? material.paragraphCount : pages.length,
    slides: isDeck ? pages.map(page => ({ slideNumber: Number(page.page || 1), text: page.markdown || '', charCount: String(page.markdown || '').length })) : material.slides,
    ocrRequired: false,
    ocrCompleted: true,
    warnings: markdown ? [] : ['在线文字识别没有返回可用文字。']
  }
}

export function materialsToTextPackInput({ materials, courseName, teacher }) {
  const isDeck = item => item.kind === 'deck' || item.kind === 'slides' || item.role === 'slides'
  const isTranscript = item => item.kind === 'transcript' || item.role === 'transcript'
  const groups = new Map()

  materials.forEach(material => {
    const groupKey = material.lessonGroupId || `order-${Number(material.lessonOrder || 1)}`
    if (!groups.has(groupKey)) groups.set(groupKey, { order: Number(material.lessonOrder || groups.size + 1), title: material.lessonTitle || '', materials: [] })
    groups.get(groupKey).materials.push(material)
  })

  const lessons = []
  const warnings = []
  for (const [, groupInfo] of [...groups.entries()].sort((a, b) => a[1].order - b[1].order)) {
    const order = groupInfo.order
    const group = groupInfo.materials
    const textMaterials = group.filter(item => !isDeck(item) && cleanText(item.text))
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
        sourceMap.push({ ...mapped, line: transcriptLines.length, sourceLine: mapped.sourceLine || lineIndex + 1, file: mapped.file || item.sourceFile, role: item.role })
      })
    })

    const first = primary[0]
    lessons.push({
      order,
      key: `lesson-${String(order).padStart(2, '0')}`,
      title: groupInfo.title || (primary.length === 1 ? first.title : `第 ${order} 课`),
      sourceFile: primary.length === 1 ? first.sourceFile : `lesson-${String(order).padStart(2, '0')}-materials.txt`,
      transcript: transcriptLines.join('\n'),
      sourceMap,
      materials: supporting,
      warnings: primary.flatMap(item => item.warnings || [])
    })
  }

  const decks = materials.filter(item => isDeck(item) && cleanText(item.text)).map(item => ({
    ...item,
    markdown: item.text,
    lessonOrder: Number(item.lessonOrder || 1)
  }))

  const pendingOcr = materials.filter(item => item.ocrRequired)
  if (pendingOcr.length) warnings.push(`还有 ${pendingOcr.length} 份资料等待在线文字识别。`)
  if (!lessons.length) warnings.push('没有识别到可作为课程正文的文字资料。')
  if (!materials.some(isTranscript) && lessons.length) warnings.push('未识别到课堂转录，已将文档或笔记作为课程正文。')

  return { course: { name: courseName, teacher }, lessons, decks, warnings }
}
