import JSZip from 'jszip'
import { TextDecoder, TextEncoder } from 'util'

import {
  decodeTextBuffer,
  materialsToTextPackInput,
  parseCourseMaterialFile,
  parseDocxBuffer,
  suggestLessonGroups,
  suggestLessonWorkspace,
  applyAiGroupingSuggestion,
  applyOcrResultToMaterial
} from '@/lib/course/materialParsers'
import { buildTextPack, validateTextPack } from '@/lib/course/textpack'

global.TextDecoder ||= TextDecoder

function fileFromText(name, text, type = 'text/plain') {
  const bytes = new TextEncoder().encode(text)
  return {
    name,
    type,
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  }
}

async function sampleDocxBuffer({ withImage = false } = {}) {
  const zip = new JSZip()
  zip.file('word/document.xml', [
    '<w:document xmlns:w="w">',
    '<w:body>',
    '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>第一章</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>普通段落</w:t></w:r></w:p>',
    '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>表格文字</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    '</w:body>',
    '</w:document>'
  ].join(''))
  if (withImage) zip.file('word/media/image1.png', new Uint8Array([1, 2, 3]))
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('course material parsers', () => {
  it('parses SRT and builds a valid course text pack', async () => {
    const material = await parseCourseMaterialFile(fileFromText('第1课.srt', '1\n00:00:01,000 --> 00:00:02,000\n第一句'))
    const input = materialsToTextPackInput({ materials: [material], courseName: '证据法', teacher: '张老师' })
    const pack = buildTextPack({ ...input, preferences: {} })

    expect(material.kind).toBe('transcript')
    expect(pack.lessons[0].transcript).toBe('第一句')
    expect(validateTextPack(pack).stats.lessonCount).toBe(1)
  })

  it('decodes UTF-8 BOM text and rejects garbled text', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('中文文本')])
    expect(decodeTextBuffer(bom.buffer, 'a.txt')).toBe('中文文本')
    expect(() => decodeTextBuffer(new Uint8Array([0, 1, 2, 3]).buffer, 'bad.txt')).toThrow(/编码/)
  })

  it('parses Markdown as existing note material', async () => {
    const material = await parseCourseMaterialFile(fileFromText('note.md', '# 标题\n\n- 要点\n\n| A | B |'))

    expect(material.kind).toBe('markdown')
    expect(material.markdownStats.headingCount).toBe(1)
    expect(material.markdownStats.tableCount).toBe(1)
  })

  it('extracts DOCX headings, paragraphs, tables and image warnings', async () => {
    const doc = await parseDocxBuffer(await sampleDocxBuffer({ withImage: true }), '讲义.docx')

    expect(doc.text).toContain('# 第一章')
    expect(doc.text).toContain('普通段落')
    expect(doc.text).toContain('表格文字')
    expect(doc.warnings[0]).toContain('图片')
  })

  it('rejects legacy ppt and doc formats with conversion guidance', async () => {
    await expect(parseCourseMaterialFile(fileFromText('old.ppt', 'x'))).rejects.toThrow(/另存为 PPTX/)
    await expect(parseCourseMaterialFile(fileFromText('old.doc', 'x'))).rejects.toThrow(/另存为 DOCX/)
  })

  it('keeps user-selected roles and combines multiple text sources by lesson', async () => {
    const transcript = await parseCourseMaterialFile(fileFromText('第1课.txt', '教师讲授内容'), 'transcript')
    const handout = await parseCourseMaterialFile(fileFromText('第1课讲义.md', '# 讲义补充'), 'handout')
    const input = materialsToTextPackInput({ materials: [transcript, handout], courseName: '证据法', teacher: '张老师' })

    expect(transcript.role).toBe('transcript')
    expect(input.lessons).toHaveLength(1)
    expect(input.lessons[0].transcript).toContain('教师讲授内容')
    expect(input.lessons[0].materials[0].role).toBe('handout')
  })

  it('suggests date-based lesson groups and keeps low-confidence materials editable', async () => {
    const transcript = await parseCourseMaterialFile(fileFromText('2026-03-12课堂转录.srt', '1\n00:00:01,000 --> 00:00:02,000\n第一句'))
    const handout = await parseCourseMaterialFile(fileFromText('2026.3.12讲义.txt', '讲义内容'), 'handout')
    const grouped = suggestLessonGroups([transcript, handout])

    expect(grouped.groups).toHaveLength(1)
    expect(grouped.materials[0].lessonGroupId).toBe(grouped.materials[1].lessonGroupId)
  })

  it('represents scan files as OCR-required and applies page markdown without binary data', async () => {
    const scan = await parseCourseMaterialFile(fileFromText('扫描件.pdf', 'fake pdf', 'application/pdf'), 'handout')
    expect(scan.ocrRequired).toBe(true)
    const done = applyOcrResultToMaterial(scan, { pages: [{ page: 1, markdown: '# 第一页' }], markdown: '## 第 1 页\n\n# 第一页' })
    expect(done.ocrRequired).toBe(false)
    expect(done.text).toContain('第一页')
  })


  it('keeps materials separate from lessons and supports one deck across multiple lessons', async () => {
    const first = await parseCourseMaterialFile(fileFromText('第一课.srt', '1\n00:00:01,000 --> 00:00:02,000\n第一课内容'))
    const second = await parseCourseMaterialFile(fileFromText('第二课.srt', '1\n00:00:01,000 --> 00:00:02,000\n第二课内容'))
    const deck = {
      kind: 'deck', role: 'slides', clientKey: 'deck-1', sourceFile: '总课件.pptx', title: '总课件', text: '全部课件', charCount: 4,
      slideCount: 4,
      slides: [1, 2, 3, 4].map(page => ({ slideNumber: page, text: `第${page}页` })),
      assignments: [
        { id: 'a1', materialKey: 'deck-1', lessonKey: 'lesson-1', scope: 'lesson', range: { unit: 'page', start: 1, end: 2 }, locked: true },
        { id: 'a2', materialKey: 'deck-1', lessonKey: 'lesson-2', scope: 'lesson', range: { unit: 'page', start: 3, end: 4 }, locked: true }
      ]
    }
    first.assignments = [{ id: 't1', materialKey: first.clientKey, lessonKey: 'lesson-1', scope: 'lesson', range: { unit: 'line', start: 1, end: 1 }, locked: true }]
    second.assignments = [{ id: 't2', materialKey: second.clientKey, lessonKey: 'lesson-2', scope: 'lesson', range: { unit: 'line', start: 1, end: 1 }, locked: true }]

    const input = materialsToTextPackInput({
      materials: [first, second, deck],
      lessonGroups: [
        { key: 'lesson-1', title: '第一课', order: 1 },
        { key: 'lesson-2', title: '第二课', order: 2 }
      ],
      courseName: '国际法'
    })

    expect(input.lessons).toHaveLength(2)
    expect(input.decks).toHaveLength(2)
    expect(input.decks[0].slides.map(slide => slide.slideNumber)).toEqual([1, 2])
    expect(input.decks[1].slides.map(slide => slide.slideNumber)).toEqual([3, 4])
  })

  it('does not create one lesson for every unanchored slide deck', () => {
    const workspace = suggestLessonWorkspace([
      { kind: 'deck', role: 'slides', clientKey: 'p1', sourceFile: '课件甲.pptx', title: '课件甲', text: '内容甲', slideCount: 2, slides: [] },
      { kind: 'deck', role: 'slides', clientKey: 'p2', sourceFile: '课件乙.pptx', title: '课件乙', text: '内容乙', slideCount: 3, slides: [] }
    ])

    expect(workspace.groups).toHaveLength(1)
    expect(workspace.materials.every(material => material.assignments.length === 0)).toBe(true)
  })

  it('preserves locked manual assignments while applying AI suggestions to other materials', () => {
    const materials = [
      { kind: 'transcript', role: 'transcript', clientKey: 'locked', text: 'a', lineCount: 1, assignments: [{ id: 'manual', materialKey: 'locked', lessonKey: 'l1', scope: 'lesson', range: { unit: 'line', start: 1, end: 1 }, locked: true }] },
      { kind: 'deck', role: 'slides', clientKey: 'new', text: 'b', slideCount: 2, slides: [] }
    ]
    const result = applyAiGroupingSuggestion(materials, [{ key: 'l1', title: '第一课', order: 1 }], {
      lessons: [],
      assignments: [{ materialKey: 'new', lessonKey: 'l1', scope: 'lesson', range: { unit: 'page', start: 1, end: 2 }, confidence: 'high', reason: '内容对应' }]
    })

    expect(result.materials[0].assignments[0].id).toBe('manual')
    expect(result.materials[1].assignments[0].source).toBe('ai')
  })

  it('keeps explicitly unassigned material unassigned even when only one lesson exists', () => {
    const material = {
      kind: 'deck',
      role: 'slides',
      clientKey: 'deck-unassigned',
      sourceFile: '总论课件.pptx',
      title: '总论课件',
      text: '第一页',
      markdown: '第一页',
      charCount: 3,
      slideCount: 1,
      slides: [{ slideNumber: 1, text: '第一页' }],
      assignments: []
    }
    const input = materialsToTextPackInput({
      materials: [material],
      lessonGroups: [{ key: 'lesson-1', title: '第一课', order: 1 }],
      courseName: '国际法',
      teacher: ''
    })
    expect(input.decks).toHaveLength(0)
    expect(input.warnings.join(' ')).toContain('尚未归档')
  })

})
