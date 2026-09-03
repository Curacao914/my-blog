import JSZip from 'jszip'

import { cleanText, safeName } from './textpack'

function decodeXml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function extractTextRuns(xml) {
  const runs = []
  const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g
  let match
  while ((match = regex.exec(xml))) {
    const text = decodeXml(match[1]).replace(/\s+/g, ' ').trim()
    if (text) runs.push(text)
  }
  return runs
}

function slideNumberFromPath(path) {
  const match = String(path || '').match(/slide(\d+)\.xml$/)
  return match ? Number(match[1]) : 0
}

async function textFromZipFile(file) {
  if (!file) return ''
  return file.async('text')
}

export async function extractPptxTextFromBuffer(buffer, fileName = 'slides.pptx') {
  const zip = await JSZip.loadAsync(buffer)
  const slideEntries = Object.values(zip.files)
    .filter(file => /^ppt\/slides\/slide\d+\.xml$/.test(file.name))
    .sort((a, b) => slideNumberFromPath(a.name) - slideNumberFromPath(b.name))

  const notesEntries = new Map(
    Object.values(zip.files)
      .filter(file => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(file.name))
      .map(file => [slideNumberFromPath(file.name.replace('notesSlide', 'slide')), file])
  )

  const slides = []
  for (const entry of slideEntries) {
    const slideNumber = slideNumberFromPath(entry.name)
    const [slideXml, notesXml] = await Promise.all([
      textFromZipFile(entry),
      textFromZipFile(notesEntries.get(slideNumber))
    ])
    const slideText = extractTextRuns(slideXml).join('\n')
    const notesText = extractTextRuns(notesXml).join('\n')
    const sections = [`## 第 ${slideNumber} 页`, slideText]
    if (notesText) sections.push(`备注：\n${notesText}`)
    const text = cleanText(sections.filter(Boolean).join('\n\n'))
    slides.push({
      slideNumber,
      text,
      charCount: text.length
    })
  }

  const totalChars = slides.reduce((sum, slide) => sum + slide.charCount, 0)
  const textDensity = slides.length ? totalChars / slides.length : 0
  const markdown = slides.map(slide => slide.text).filter(Boolean).join('\n\n')
  const ocrRequired = slides.length > 0 && textDensity < 30
  const warnings = []
  if (!slideEntries.length) warnings.push(`${fileName} 没有找到可读取的 PPTX 幻灯片 XML。`)
  if (ocrRequired) warnings.push(`${fileName} 文本密度较低，可能是图片型课件，需要后续 OCR。`)

  return {
    title: safeName(fileName.replace(/\.pptx$/i, ''), '课件'),
    fileName: safeName(fileName, 'slides.pptx'),
    slideCount: slides.length,
    textDensity,
    ocrRequired,
    markdown,
    slides,
    warnings
  }
}

export async function extractPptxTextFromFile(file) {
  const buffer = await file.arrayBuffer()
  return extractPptxTextFromBuffer(buffer, file.name)
}
