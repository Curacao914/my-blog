import JSZip from 'jszip'

import { extractPptxTextFromBuffer } from '@/lib/course/pptxText'
import {
  TEXTPACK_SCHEMA_VERSION,
  buildTextPack,
  parseSrtText,
  validateTextPack
} from '@/lib/course/textpack'

describe('course TextPack helpers', () => {
  it('parses SRT text without timestamps and builds a valid pure-text pack', () => {
    const parsed = parseSrtText(
      ['1', '00:00:01,000 --> 00:00:03,000', '<i>第一句</i>', '', '2', '00:00:04,000 --> 00:00:05,000', '第二句'].join('\n'),
      '第1课.srt'
    )
    const pack = buildTextPack({
      course: { name: '证据法', teacher: '张老师' },
      lessons: [
        {
          order: 1,
          title: '第1课',
          sourceFile: '第1课.srt',
          transcript: parsed.text,
          sourceMap: parsed.sourceMap
        }
      ],
      decks: []
    })

    expect(parsed.text).toBe('第一句\n第二句')
    expect(pack.schemaVersion).toBe(TEXTPACK_SCHEMA_VERSION)
    expect(validateTextPack(pack).stats.lessonCount).toBe(1)
    expect(pack.lessons[0].transcript).not.toContain('00:00:01,000 -->')
    expect(pack.lessons[0].sourceMap[0].time).toContain('00:00:01,000 -->')
  })

  it('rejects base64 and local absolute paths', () => {
    const pack = buildTextPack({
      course: { name: '课程' },
      lessons: [{ order: 1, transcript: '正文' }],
      decks: []
    })

    expect(() =>
      validateTextPack({
        ...pack,
        lessons: [{ ...pack.lessons[0], transcript: 'A'.repeat(320) }]
      })
    ).toThrow(/base64/)

    expect(() =>
      validateTextPack({
        ...pack,
        ppt_text: [{ key: 'deck-1', title: 'x', markdown: '/Users/curacao/raw/file.pptx' }]
      })
    ).toThrow(/本地绝对路径/)
  })

  it('extracts readable PPTX XML text and flags low-density decks', async () => {
    const zip = new JSZip()
    zip.file('ppt/slides/slide1.xml', '<p:sld><a:t>第一章 导论</a:t><a:t>证据规则</a:t></p:sld>')
    zip.file('ppt/slides/slide2.xml', '<p:sld></p:sld>')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    const deck = await extractPptxTextFromBuffer(buffer, '证据法.pptx')

    expect(deck.slideCount).toBe(2)
    expect(deck.markdown).toContain('第一章 导论')
    expect(deck.markdown).toContain('证据规则')
    expect(deck.ocrRequired).toBe(true)
  })
})
