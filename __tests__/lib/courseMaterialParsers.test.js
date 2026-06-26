import JSZip from 'jszip'
import { TextDecoder, TextEncoder } from 'util'

import {
  decodeTextBuffer,
  materialsToTextPackInput,
  parseCourseMaterialFile,
  parseDocxBuffer
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

})
