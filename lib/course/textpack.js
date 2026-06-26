export const TEXTPACK_SCHEMA_VERSION = 'course-textpack.v1'

export const TEXTPACK_LIMITS = {
  maxLessons: 80,
  maxTranscriptCharsPerLesson: 220000,
  maxPptCharsPerDeck: 160000,
  maxCourseChars: 1800000,
  maxSegmentsPerLesson: 80
}

const SOURCE_PATH_PATTERN = /(?:^|[/"'`])(?:Users|private|var|tmp|Volumes|home)\//i
const BASE64_BLOCK_PATTERN = /(?:data:[^,]+;base64,|[A-Za-z0-9+/]{300,}={0,2})/

export function cleanText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u0000/g, '')
    .trim()
}

export function safeName(value, fallback = '未命名') {
  const text = cleanText(value).normalize('NFKC')
  return text.replace(/[<>:"|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || fallback
}

export function inferLessonOrder(fileName, fallback = 1) {
  const normalized = String(fileName || '').normalize('NFKC')
  const match =
    normalized.match(/第\s*(\d{1,3})\s*[讲课节]/) ||
    normalized.match(/(?:lesson|lecture|class|session)[-_\s]*(\d{1,3})/i) ||
    normalized.match(/(?:^|[^\d])(\d{1,3})(?:[^\d]|$)/)
  return match ? Number(match[1]) : fallback
}

export function parseSrtText(rawText, fileName = 'transcript.srt') {
  const lines = String(rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const transcriptLines = []
  const sourceMap = []
  let currentTime = null

  lines.forEach((line, index) => {
    const raw = line.trim()
    if (!raw) return
    if (/^\d+$/.test(raw)) return
    if (/^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}/.test(raw)) {
      currentTime = raw
      return
    }

    const text = raw
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\[^}]+\}/g, '')
      .trim()

    if (!text) return
    transcriptLines.push(text)
    sourceMap.push({
      line: transcriptLines.length,
      sourceLine: index + 1,
      time: currentTime,
      file: fileName
    })
  })

  return {
    text: transcriptLines.join('\n'),
    lineCount: transcriptLines.length,
    sourceMap,
    warnings: transcriptLines.length ? [] : ['SRT 没有解析到可用正文。']
  }
}

export function splitTranscript(text, options = {}) {
  const lines = cleanText(text).split('\n').filter(Boolean)
  const targetLines = Number(options.lines || 500)
  const maxSegments = TEXTPACK_LIMITS.maxSegmentsPerLesson
  const segments = []

  for (let index = 0; index < lines.length && segments.length < maxSegments; index += targetLines) {
    const chunk = lines.slice(index, index + targetLines)
    segments.push({
      key: `segment-${String(segments.length + 1).padStart(2, '0')}`,
      startLine: index + 1,
      endLine: index + chunk.length,
      charCount: chunk.join('\n').length,
      text: chunk.join('\n')
    })
  }

  return segments
}

function textChecksum(text) {
  let hash = 2166136261
  const value = String(text || '')
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function buildTextPack({ course = {}, preferences = {}, lessons = [], decks = [], warnings = [] }) {
  const normalizedLessons = lessons
    .map((lesson, index) => {
      const order = Number(lesson.order || lesson.lessonOrder || index + 1)
      const transcript = cleanText(lesson.transcript || lesson.text || '')
      const title = safeName(lesson.title || `第 ${order} 课`)
      return {
        order,
        key: lesson.key || `lesson-${String(order).padStart(2, '0')}`,
        title,
        sourceFile: safeName(lesson.sourceFile || lesson.fileName || `${title}.srt`),
        transcript,
        transcriptCharCount: transcript.length,
        transcriptLineCount: transcript ? transcript.split('\n').length : 0,
        segments: Array.isArray(lesson.segments) ? lesson.segments : splitTranscript(transcript),
        materials: Array.isArray(lesson.materials)
          ? lesson.materials.map(material => ({
              kind: cleanText(material.kind || 'text'),
              role: cleanText(material.role || '补充材料'),
              title: safeName(material.title || material.sourceFile || '补充材料'),
              sourceFile: safeName(material.sourceFile || material.title || 'material'),
              text: cleanText(material.text),
              charCount: cleanText(material.text).length,
              warnings: Array.isArray(material.warnings) ? material.warnings : []
            }))
          : [],
        sourceMap: Array.isArray(lesson.sourceMap) ? lesson.sourceMap : [],
        warnings: Array.isArray(lesson.warnings) ? lesson.warnings : []
      }
    })
    .sort((a, b) => a.order - b.order)

  const pptText = decks.map((deck, index) => {
    const markdown = cleanText(deck.markdown || deck.text || '')
    return {
      key: deck.key || `deck-${String(index + 1).padStart(2, '0')}`,
      title: safeName(deck.title || deck.fileName || `课件 ${index + 1}`),
      sourceFile: safeName(deck.sourceFile || deck.fileName || `deck-${index + 1}.pptx`),
      slideCount: Number(deck.slideCount || deck.slides?.length || 0),
      textDensity: Number(deck.textDensity || 0),
      ocrRequired: Boolean(deck.ocrRequired),
      markdown,
      charCount: markdown.length,
      slides: Array.isArray(deck.slides) ? deck.slides : [],
      warnings: Array.isArray(deck.warnings) ? deck.warnings : []
    }
  })

  const transcriptChars = normalizedLessons.reduce((sum, lesson) => sum + lesson.transcriptCharCount, 0)
  const pptChars = pptText.reduce((sum, deck) => sum + deck.charCount, 0)
  const sourceHash = textChecksum(
    JSON.stringify({
      course,
      lessons: normalizedLessons.map(lesson => [lesson.sourceFile, lesson.transcriptCharCount, textChecksum(lesson.transcript)]),
      decks: pptText.map(deck => [deck.sourceFile, deck.charCount, textChecksum(deck.markdown), deck.ocrRequired])
    })
  )

  return {
    schemaVersion: TEXTPACK_SCHEMA_VERSION,
    manifest: {
      createdAt: new Date().toISOString(),
      sourceHash,
      lessonCount: normalizedLessons.length,
      deckCount: pptText.length,
      transcriptChars,
      pptChars,
      totalChars: transcriptChars + pptChars,
      quotas: TEXTPACK_LIMITS
    },
    course: {
      name: safeName(course.name || course.courseName || '未命名课程'),
      teacher: cleanText(course.teacher || ''),
      lessonRange: cleanText(course.lessonRange || course.lesson || '')
    },
    preferences: preferences && typeof preferences === 'object' ? preferences : {},
    lessons: normalizedLessons,
    ppt_text: pptText,
    source_maps: {
      transcripts: normalizedLessons.map(lesson => ({
        lessonKey: lesson.key,
        sourceFile: lesson.sourceFile,
        lines: lesson.sourceMap
      })),
      slides: pptText.map(deck => ({
        deckKey: deck.key,
        sourceFile: deck.sourceFile,
        slides: deck.slides.map(slide => ({
          slideNumber: slide.slideNumber,
          charCount: cleanText(slide.text).length
        }))
      }))
    },
    checksums: {
      sourceHash,
      lessons: Object.fromEntries(normalizedLessons.map(lesson => [lesson.key, textChecksum(lesson.transcript)])),
      decks: Object.fromEntries(pptText.map(deck => [deck.key, textChecksum(deck.markdown)]))
    },
    warnings: [
      ...warnings,
      ...normalizedLessons.flatMap(lesson => lesson.warnings),
      ...normalizedLessons.flatMap(lesson => lesson.materials.flatMap(material => material.warnings || [])),
      ...pptText.flatMap(deck => deck.warnings)
    ].filter(Boolean)
  }
}

function assertNoRawPayload(value, path = 'textPack') {
  if (value == null) return
  if (typeof value === 'string') {
    if (BASE64_BLOCK_PATTERN.test(value)) {
      throw new Error(`${path} 包含疑似 base64/二进制内容，TextPack 只允许纯文本。`)
    }
    if (SOURCE_PATH_PATTERN.test(value)) {
      throw new Error(`${path} 包含本地绝对路径，TextPack 不能保存用户本地路径。`)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRawPayload(item, `${path}[${index}]`))
    return
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => assertNoRawPayload(item, `${path}.${key}`))
  }
}

export function validateTextPack(textPack) {
  if (!textPack || typeof textPack !== 'object') throw new Error('TextPack is required')
  if (textPack.schemaVersion !== TEXTPACK_SCHEMA_VERSION) {
    throw new Error(`Unsupported TextPack schema: ${textPack.schemaVersion || 'missing'}`)
  }
  assertNoRawPayload(textPack)

  const lessons = Array.isArray(textPack.lessons) ? textPack.lessons : []
  const decks = Array.isArray(textPack.ppt_text) ? textPack.ppt_text : []
  if (!lessons.length) throw new Error('至少需要一份可用 SRT 转录。')
  if (lessons.length > TEXTPACK_LIMITS.maxLessons) throw new Error(`课次数超过上限 ${TEXTPACK_LIMITS.maxLessons}。`)

  const warnings = []
  let totalChars = 0
  lessons.forEach(lesson => {
    const transcript = cleanText(lesson.transcript)
    if (!transcript) warnings.push(`${lesson.title || lesson.key} 缺少转录正文。`)
    if (transcript.length > TEXTPACK_LIMITS.maxTranscriptCharsPerLesson) {
      throw new Error(`${lesson.title || lesson.key} 转录超过单课上限。`)
    }
    if (Array.isArray(lesson.segments) && lesson.segments.length > TEXTPACK_LIMITS.maxSegmentsPerLesson) {
      throw new Error(`${lesson.title || lesson.key} 分段数超过上限。`)
    }
    totalChars += transcript.length
  })

  decks.forEach(deck => {
    const markdown = cleanText(deck.markdown)
    if (markdown.length > TEXTPACK_LIMITS.maxPptCharsPerDeck) {
      throw new Error(`${deck.title || deck.key} 课件文本超过单份上限。`)
    }
    if (deck.ocrRequired && !markdown) warnings.push(`${deck.title || deck.key} 是低文本密度课件，需要后续 OCR。`)
    totalChars += markdown.length
  })

  if (totalChars > TEXTPACK_LIMITS.maxCourseChars) {
    throw new Error(`课程总字符数超过上限 ${TEXTPACK_LIMITS.maxCourseChars}。`)
  }

  return {
    ok: true,
    warnings,
    stats: {
      lessonCount: lessons.length,
      deckCount: decks.length,
      totalChars,
      ocrRequired: decks.filter(deck => deck.ocrRequired).length
    }
  }
}

export function summarizeTextPack(textPack) {
  const validation = validateTextPack(textPack)
  return {
    courseName: textPack.course?.name || '未命名课程',
    teacher: textPack.course?.teacher || '',
    lessonCount: validation.stats.lessonCount,
    deckCount: validation.stats.deckCount,
    totalChars: validation.stats.totalChars,
    ocrRequired: validation.stats.ocrRequired,
    warnings: [...(textPack.warnings || []), ...validation.warnings].filter(Boolean)
  }
}
