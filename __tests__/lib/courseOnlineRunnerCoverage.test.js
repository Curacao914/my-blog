import { findOutlineCoverageGaps, numberTranscript, transcriptLines } from '@/lib/course/onlineRunner'

describe('course outline source coverage helpers', () => {
  test('numbers normalized transcript lines with stable absolute labels', () => {
    const source = '第一行\n\n第二行\n第三行'
    expect(transcriptLines(source)).toEqual(['第一行', '第二行', '第三行'])
    expect(numberTranscript(source)).toBe('[L1] 第一行\n[L2] 第二行\n[L3] 第三行')
    expect(numberTranscript(source, [2, 3])).toBe('[L2] 第二行\n[L3] 第三行')
  })

  test('finds internal and trailing outline coverage gaps', () => {
    const outline = [
      { lineRange: [1, 530] },
      { lineRange: [2002, 2100] }
    ]
    expect(findOutlineCoverageGaps(outline, 2200)).toEqual([
      [531, 2001],
      [2101, 2200]
    ])
  })

  test('overlapping ranges do not create false gaps', () => {
    const outline = [
      { lineRange: [1, 100] },
      { lineRange: [80, 200] }
    ]
    expect(findOutlineCoverageGaps(outline, 200)).toEqual([])
  })
})
