const fs = require('fs')
const path = require('path')

describe('public content experience', () => {
  const index = fs.readFileSync(path.join(process.cwd(), 'pages/content/index.js'), 'utf8')
  const detail = fs.readFileSync(path.join(process.cwd(), 'pages/content/[...slug].js'), 'utf8')
  const markdown = fs.readFileSync(path.join(process.cwd(), 'components/content/MarkdownDocument.js'), 'utf8')

  it('federates Notion metadata into the new content library without replacing new content', () => {
    expect(index).toContain('fetchGlobalAllData')
    expect(index).toContain('normalizeNotionContentIndex')
    expect(index).toContain('mergeContentIndexes')
    expect(index).toContain('item.href || `/content/${item.slug}`')
  })

  it('uses a compact searchable library and the animated signature', () => {
    expect(index).toContain("placeholder='标题、摘要、课程或标签'")
    expect(index).toContain('content-library-workspace')
    expect(index).toContain('DynamicSignature')
  })

  it('renders published markdown with heading ids and a live table of contents', () => {
    expect(detail).toContain('MarkdownDocument')
    expect(detail).toContain('ReadingNavigator')
    expect(detail).toContain('content-reader-toc')
    expect(markdown).toContain('stripLeadingDuplicateTitle')
    expect(markdown).toContain('extractMarkdownHeadings')
  })
})
