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
  const sample = `${material.sourceFile || ''} ${material.title || ''} ${String(material.text || '').slice(0, 500)}`.normalize('NFKC')
  const fullDate = sample.match(/(20\d{2})[年./_-]\s*(\d{1,2})[月./_-]\s*(\d{1,2})日?/) || sample.match(/(20\d{2})(\d{2})(\d{2})/)
  if (fullDate) {
    const date = `${fullDate[1]}-${String(fullDate[2]).padStart(2, '0')}-${String(fullDate[3]).padStart(2, '0')}`
    return { key: `date-${date}`, title: date, date, confidence: 'high', kind: 'date' }
  }
  const monthDay = sample.match(/(?:^|\D)(\d{1,2})月\s*(\d{1,2})日/)
  if (monthDay) return { key: `date-md-${monthDay[1]}-${monthDay[2]}`, title: `${monthDay[1]}月${monthDay[2]}日`, date: `${monthDay[1]}-${monthDay[2]}`, confidence: 'medium', kind: 'date' }
  const ordinal = sample.match(/第\s*(\d{1,3})\s*[讲课节周]/) || sample.match(/(?:lesson|lecture|class|session)[-_\s]*(\d{1,3})/i)
  if (ordinal) return { key: `lesson-${Number(ordinal[1])}`, title: `第 ${Number(ordinal[1])} 课`, confidence: 'high', order: Number(ordinal[1]), kind: 'ordinal' }
  return null
}

function similarityTokens(value = '') {
  const normalized = normalizeHint(value)
  const words = normalized.split(' ').filter(token => token.length > 1)
  const compact = normalized.replace(/\s+/g, '')
  const grams = []
  for (let index = 0; index < compact.length - 1 && grams.length < 160; index += 1) grams.push(compact.slice(index, index + 2))
  return new Set([...words, ...grams])
}

function tokenSimilarity(left = '', right = '') {
  const a = similarityTokens(left)
  const b = similarityTokens(right)
  if (!a.size || !b.size) return 0
  const common = [...a].filter(token => b.has(token)).length
  return common / Math.max(1, Math.min(a.size, b.size))
}

export function materialRangeUnit(material = {}) {
  if (material.kind === 'deck' || material.role === 'slides') return 'page'
  if (material.kind === 'transcript' || material.role === 'transcript') return 'line'
  return 'paragraph'
}

export function materialRangeExtent(material = {}) {
  const unit = materialRangeUnit(material)
  if (unit === 'page') return Math.max(1, Number(material.slideCount || material.slides?.length || 1))
  if (unit === 'line') return Math.max(1, Number(material.lineCount || cleanText(material.text).split('\n').filter(Boolean).length || 1))
  return Math.max(1, Number(material.paragraphCount || cleanText(material.text).split(/\n\s*\n/).filter(Boolean).length || 1))
}

export function wholeMaterialAssignment(material, patch = {}) {
  return {
    id: patch.id || `assignment-${material.clientKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    materialKey: material.clientKey,
    lessonKey: patch.lessonKey || '',
    scope: patch.scope || 'lesson',
    range: {
      unit: materialRangeUnit(material),
      start: 1,
      end: materialRangeExtent(material)
    },
    confidence: patch.confidence || 'manual',
    reason: patch.reason || '',
    source: patch.source || 'manual',
    locked: patch.locked !== false
  }
}

function chunkText(text = '', size = 1800, maxChunks = 24) {
  const value = cleanText(text)
  const chunks = []
  for (let start = 0; start < value.length && chunks.length < maxChunks; start += size) {
    chunks.push(value.slice(start, start + size))
  }
  return chunks
}

export function buildMaterialGroupingIndex(material = {}) {
  const unit = materialRangeUnit(material)
  let chunks = []
  if (unit === 'page') {
    chunks = (material.slides || []).slice(0, 80).map(slide => ({
      start: Number(slide.slideNumber || 1),
      end: Number(slide.slideNumber || 1),
      text: cleanText(slide.text).slice(0, 500)
    }))
  } else if (unit === 'line') {
    const lines = cleanText(material.text).split('\n')
    for (let start = 0; start < lines.length && chunks.length < 30; start += 120) {
      chunks.push({ start: start + 1, end: Math.min(lines.length, start + 120), text: lines.slice(start, start + 120).join(' ').slice(0, 900) })
    }
  } else {
    const paragraphs = cleanText(material.text).split(/\n\s*\n/).filter(Boolean)
    if (paragraphs.length > 1) {
      for (let start = 0; start < paragraphs.length && chunks.length < 30; start += 12) {
        chunks.push({ start: start + 1, end: Math.min(paragraphs.length, start + 12), text: paragraphs.slice(start, start + 12).join(' ').slice(0, 900) })
      }
    } else {
      chunks = chunkText(material.text).map((text, index) => ({ start: index + 1, end: index + 1, text: text.slice(0, 900) }))
    }
  }
  return {
    clientKey: material.clientKey,
    sourceFile: material.sourceFile,
    title: material.title,
    role: material.role,
    kind: material.kind,
    unit,
    extent: materialRangeExtent(material),
    signal: explicitLessonSignal(material),
    chunks
  }
}

function lessonEvidence(group = {}) {
  return [group.title, group.date, ...(group.evidence || [])].filter(Boolean).join(' ')
}

function normalizeExistingLesson(lesson, index) {
  return {
    key: lesson.key || `existing-${index + 1}`,
    title: lesson.title || `第 ${index + 1} 课`,
    order: Number(lesson.order || index + 1),
    date: lesson.date || '',
    confidence: lesson.confidence || 'manual',
    reason: lesson.reason || '已有课次',
    evidence: Array.isArray(lesson.evidence) ? lesson.evidence : [lesson.title || ''],
    existing: Boolean(lesson.existing)
  }
}

function matchSignalToGroup(signal, groups) {
  if (!signal) return null
  return groups.find(group => group.signalKey === signal.key || normalizeHint(group.title) === normalizeHint(signal.title) || (signal.date && group.date === signal.date)) || null
}

export function suggestLessonWorkspace(materials = [], existingLessons = []) {
  const groups = existingLessons.map(normalizeExistingLesson)
  const resultMaterials = materials.map(material => ({ ...material, assignments: Array.isArray(material.assignments) ? material.assignments : [] }))
  const transcriptAnchors = resultMaterials.filter(material => material.kind === 'transcript' || material.role === 'transcript')

  transcriptAnchors.forEach((material, index) => {
    const locked = material.assignments.filter(assignment => assignment.locked)
    if (locked.length) return
    const signal = explicitLessonSignal(material)
    let group = matchSignalToGroup(signal, groups)
    if (!group && !signal) {
      const scored = groups.map(candidate => ({ candidate, score: tokenSimilarity(`${material.sourceFile} ${material.title}`, lessonEvidence(candidate)) })).sort((a, b) => b.score - a.score)[0]
      if (scored?.score >= 0.72) group = scored.candidate
    }
    if (!group) {
      const order = groups.length + 1
      group = {
        key: signal?.key || `transcript-${order}`,
        signalKey: signal?.key || '',
        title: signal?.title || material.title || `课次 ${order}`,
        order: signal?.order || order,
        date: signal?.date || '',
        confidence: signal?.confidence || 'medium',
        reason: signal ? '从课堂转录中的日期或课次信息识别' : '以课堂转录作为课次候选',
        evidence: [material.sourceFile, material.title, cleanText(material.text).slice(0, 300)],
        existing: false
      }
      groups.push(group)
    } else {
      group.evidence = [...new Set([...(group.evidence || []), material.sourceFile, material.title, cleanText(material.text).slice(0, 300)].filter(Boolean))]
    }
    material.assignments = [wholeMaterialAssignment(material, {
      lessonKey: group.key,
      confidence: signal?.confidence || 'medium',
      reason: group.reason,
      source: 'rule',
      locked: false
    })]
  })

  resultMaterials.filter(material => !(material.kind === 'transcript' || material.role === 'transcript')).forEach(material => {
    if (material.assignments.some(assignment => assignment.locked)) return
    const signal = explicitLessonSignal(material)
    let group = matchSignalToGroup(signal, groups)
    let confidence = signal ? signal.confidence : 'low'
    let reason = signal ? '文件日期或课次信息与候选课次一致' : ''
    if (!group && groups.length) {
      const descriptor = `${material.sourceFile} ${material.title} ${cleanText(material.text).slice(0, 1200)}`
      const scored = groups.map(candidate => ({ candidate, score: tokenSimilarity(descriptor, lessonEvidence(candidate)) })).sort((a, b) => b.score - a.score)[0]
      if (scored?.score >= 0.38) {
        group = scored.candidate
        confidence = scored.score >= 0.62 ? 'medium' : 'low'
        reason = '材料标题或内容与该课次较为接近，建议确认'
      }
    }
    material.assignments = group ? [wholeMaterialAssignment(material, {
      lessonKey: group.key,
      confidence,
      reason,
      source: 'rule',
      locked: false
    })] : []
  })

  if (!groups.length && resultMaterials.length) {
    groups.push({ key: 'lesson-1', title: '课次 1', order: 1, confidence: 'low', reason: '未发现明确课次，请手动确认', evidence: [], existing: false })
  }

  return {
    groups: groups.sort((a, b) => Number(a.order) - Number(b.order)).map((group, index) => ({ ...group, order: index + 1 })),
    materials: resultMaterials.map(material => ({
      ...material,
      groupingStatus: material.assignments?.length ? 'suggested' : 'unassigned'
    }))
  }
}

export function applyAiGroupingSuggestion(materials = [], groups = [], suggestion = {}, options = {}) {
  const preserveLocked = options.preserveLocked !== false
  const nextGroups = [...groups]
  ;(suggestion.lessons || []).forEach((lesson, index) => {
    if (nextGroups.some(group => group.key === lesson.key)) return
    nextGroups.push({
      key: lesson.key || `ai-lesson-${nextGroups.length + 1}`,
      title: lesson.title || `课次 ${nextGroups.length + 1}`,
      order: Number(lesson.order || nextGroups.length + 1),
      date: lesson.date || '',
      confidence: lesson.confidence || 'low',
      reason: lesson.reason || 'AI 识别建议',
      evidence: Array.isArray(lesson.evidence) ? lesson.evidence : [],
      existing: Boolean(lesson.existing)
    })
  })
  const groupKeys = new Set(nextGroups.map(group => group.key))
  const byMaterial = new Map()
  ;(suggestion.assignments || []).forEach((assignment, index) => {
    if (assignment.scope === 'unassigned') {
      if (!byMaterial.has(assignment.materialKey)) byMaterial.set(assignment.materialKey, [])
      return
    }
    if (assignment.scope === 'lesson' && !groupKeys.has(assignment.lessonKey)) return
    const list = byMaterial.get(assignment.materialKey) || []
    list.push({
      id: assignment.id || `ai-assignment-${index + 1}`,
      materialKey: assignment.materialKey,
      lessonKey: assignment.scope === 'lesson' ? assignment.lessonKey : '',
      scope: assignment.scope || 'unassigned',
      range: assignment.range || { unit: 'whole', start: 1, end: 1 },
      confidence: assignment.confidence || 'low',
      reason: assignment.reason || '',
      source: 'ai',
      locked: false
    })
    byMaterial.set(assignment.materialKey, list)
  })
  return {
    groups: nextGroups.sort((a, b) => Number(a.order) - Number(b.order)).map((group, index) => ({ ...group, order: index + 1 })),
    materials: materials.map(material => {
      const current = material.assignments || []
      const locked = current.filter(assignment => assignment.locked)
      const hasSuggestion = byMaterial.has(material.clientKey)
      const ai = byMaterial.get(material.clientKey) || []
      const assignments = !hasSuggestion
        ? current
        : (preserveLocked && locked.length ? [...locked, ...ai.filter(candidate => !locked.some(existing => existing.id === candidate.id))] : ai)
      const extent = materialRangeExtent(material)
      const unit = materialRangeUnit(material)
      const normalizedAssignments = assignments.map(assignment => {
        if (assignment.scope !== 'lesson') return assignment
        const start = Math.min(extent, Math.max(1, Number(assignment.range?.start || 1)))
        const end = Math.min(extent, Math.max(start, Number(assignment.range?.end || extent)))
        return { ...assignment, range: { unit, start, end } }
      })
      return { ...material, assignments: normalizedAssignments, groupingStatus: normalizedAssignments.length ? 'suggested' : 'unassigned' }
    })
  }
}

// Backward-compatible adapter for older tests and callers.
export function suggestLessonGroups(materials = []) {
  const workspace = suggestLessonWorkspace(materials)
  return {
    groups: workspace.groups,
    materials: workspace.materials.map(material => {
      const first = material.assignments?.find(assignment => assignment.scope === 'lesson')
      const group = workspace.groups.find(item => item.key === first?.lessonKey)
      return {
        ...material,
        lessonGroupId: group?.key || '',
        lessonTitle: group?.title || '',
        lessonOrder: group?.order || material.lessonOrder,
        groupingConfidence: first?.confidence || 'low'
      }
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

function clampRange(assignment, material) {
  const extent = materialRangeExtent(material)
  const unit = assignment?.range?.unit === 'whole' ? materialRangeUnit(material) : (assignment?.range?.unit || materialRangeUnit(material))
  const start = Math.min(extent, Math.max(1, Number(assignment?.range?.start || 1)))
  const end = Math.min(extent, Math.max(start, Number(assignment?.range?.end || extent)))
  return { unit, start, end }
}

function assignmentsForMaterial(material, groups) {
  if (Array.isArray(material.assignments)) {
    return material.assignments.filter(assignment => assignment.scope !== 'unassigned')
  }
  if (material.lessonGroupId) return [wholeMaterialAssignment(material, { lessonKey: material.lessonGroupId, locked: false, source: 'legacy' })]
  if (groups.length === 1) return [wholeMaterialAssignment(material, { lessonKey: groups[0].key, locked: false, source: 'legacy-fallback' })]
  return []
}

function sliceMaterial(material, assignment) {
  const range = clampRange(assignment, material)
  const unit = materialRangeUnit(material)
  if (unit === 'page') {
    const slides = (material.slides || []).filter(slide => Number(slide.slideNumber || 1) >= range.start && Number(slide.slideNumber || 1) <= range.end)
    const markdown = slides.length
      ? slides.map(slide => `## 第 ${slide.slideNumber || 1} 页\n\n${cleanText(slide.text)}`).join('\n\n')
      : cleanText(material.text)
    return {
      ...material,
      text: markdown,
      markdown,
      slides,
      slideCount: slides.length || material.slideCount || 1,
      assignmentRange: range,
      assignmentId: assignment.id
    }
  }
  if (unit === 'line') {
    const lines = cleanText(material.text).split('\n')
    const selected = lines.slice(range.start - 1, range.end)
    const sourceMap = (material.sourceMap || []).slice(range.start - 1, range.end).map((item, index) => ({ ...item, line: index + 1 }))
    return { ...material, text: selected.join('\n'), lineCount: selected.length, sourceMap, assignmentRange: range, assignmentId: assignment.id }
  }
  const paragraphs = cleanText(material.text).split(/\n\s*\n/).filter(Boolean)
  const selected = paragraphs.slice(range.start - 1, range.end)
  return { ...material, text: selected.join('\n\n'), paragraphCount: selected.length, assignmentRange: range, assignmentId: assignment.id }
}

export function materialsToTextPackInput({ materials, lessonGroups = [], courseName, teacher, allowEmptyLessons = false }) {
  const isDeck = item => item.kind === 'deck' || item.kind === 'slides' || item.role === 'slides'
  const isTranscript = item => item.kind === 'transcript' || item.role === 'transcript'
  const groups = (lessonGroups.length ? lessonGroups : []).map((group, index) => ({ ...group, order: Number(group.order || index + 1) }))
  if (!groups.length) {
    const legacy = new Map()
    materials.forEach(material => {
      const key = material.lessonGroupId || `order-${Number(material.lessonOrder || 1)}`
      if (!legacy.has(key)) legacy.set(key, {
        key,
        title: material.lessonTitle || `第 ${Number(material.lessonOrder || legacy.size + 1)} 课`,
        order: Number(material.lessonOrder || legacy.size + 1)
      })
    })
    groups.push(...[...legacy.values()].sort((a, b) => a.order - b.order))
  }

  const materialSlices = []
  materials.forEach(material => {
    assignmentsForMaterial(material, groups).forEach(assignment => {
      if (assignment.scope === 'course') {
        groups.forEach(group => materialSlices.push({ material: sliceMaterial(material, assignment), assignment: { ...assignment, lessonKey: group.key, scope: 'lesson' }, group }))
        return
      }
      if (assignment.scope !== 'lesson') return
      const group = groups.find(item => item.key === assignment.lessonKey)
      if (group) materialSlices.push({ material: sliceMaterial(material, assignment), assignment, group })
    })
  })

  const lessons = []
  const decks = []
  const warnings = []
  groups.sort((a, b) => a.order - b.order).forEach(group => {
    const slices = materialSlices.filter(item => item.group.key === group.key)
    const textMaterials = slices.map(item => item.material).filter(item => !isDeck(item) && cleanText(item.text))
    const explicitTranscripts = textMaterials.filter(isTranscript)
    const primary = explicitTranscripts.length ? explicitTranscripts : textMaterials
    const supporting = textMaterials.filter(item => !primary.includes(item))
    if (!primary.length) {
      warnings.push(`${group.title || `第 ${group.order} 课`} 没有新增正文文字，仅补充其他材料。`)
      if (allowEmptyLessons && slices.some(item => isDeck(item.material) && cleanText(item.material.text))) {
        lessons.push({
          order: group.order,
          key: group.key || `lesson-${String(group.order).padStart(2, '0')}`,
          title: group.title || `第 ${group.order} 课`,
          sourceFile: `${group.key || `lesson-${group.order}`}-supplement.txt`,
          transcript: '',
          sourceMap: [],
          materials: [],
          warnings: ['本次仅补充课件或其他材料。']
        })
        slices.map(item => item.material).filter(item => isDeck(item) && cleanText(item.text)).forEach((item, deckIndex) => {
          decks.push({
            ...item,
            key: `${item.clientKey || 'deck'}-${group.key}-${deckIndex + 1}`,
            markdown: item.text,
            lessonOrder: group.order,
            sourceMaterialId: item.clientKey
          })
        })
      }
      return
    }

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

    lessons.push({
      order: group.order,
      key: group.key || `lesson-${String(group.order).padStart(2, '0')}`,
      title: group.title || `第 ${group.order} 课`,
      sourceFile: primary.length === 1 ? primary[0].sourceFile : `${group.key || `lesson-${group.order}`}-materials.txt`,
      transcript: transcriptLines.join('\n'),
      sourceMap,
      materials: supporting,
      warnings: primary.flatMap(item => item.warnings || [])
    })

    slices.map(item => item.material).filter(item => isDeck(item) && cleanText(item.text)).forEach((item, deckIndex) => {
      decks.push({
        ...item,
        key: `${item.clientKey || 'deck'}-${group.key}-${deckIndex + 1}`,
        markdown: item.text,
        lessonOrder: group.order,
        sourceMaterialId: item.clientKey
      })
    })
  })

  const pendingOcr = materials.filter(item => item.ocrRequired)
  const unassigned = materials.filter(material => !assignmentsForMaterial(material, groups).some(assignment => assignment.scope !== 'unassigned'))
  if (pendingOcr.length) warnings.push(`还有 ${pendingOcr.length} 份资料等待在线文字识别。`)
  if (unassigned.length) warnings.push(`还有 ${unassigned.length} 份资料尚未归档。`)
  if (!lessons.length) warnings.push('没有识别到可作为课程正文的文字资料。')
  if (!materials.some(isTranscript) && lessons.length) warnings.push('未识别到课堂转录，已将文档或笔记作为课程正文。')

  return { course: { name: courseName, teacher }, lessons, decks, warnings }
}
