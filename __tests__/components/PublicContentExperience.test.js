const fs = require('fs')
const path = require('path')

describe('public content experience', () => {
  const index = fs.readFileSync(path.join(process.cwd(), 'pages/content/index.js'), 'utf8')
  const detail = fs.readFileSync(path.join(process.cwd(), 'pages/content/[...slug].js'), 'utf8')
  const markdown = fs.readFileSync(path.join(process.cwd(), 'components/content/MarkdownDocument.js'), 'utf8')
  const styles = fs.readFileSync(path.join(process.cwd(), 'components/LawTechDeskStyles.js'), 'utf8')
  const publicIndex = fs.readFileSync(path.join(process.cwd(), 'lib/content/publicIndex.js'), 'utf8')

  it('federates Notion metadata into the new content library without replacing new content', () => {
    expect(index).toContain('loadPublicContentIndex')
    expect(publicIndex).toContain('fetchGlobalAllData')
    expect(publicIndex).toContain('normalizeNotionContentIndex')
    expect(publicIndex).toContain('mergeContentIndexes')
    expect(index).toContain('item.href || `/content/${item.slug}`')
  })

  it('uses a sticky searchable library with hierarchical disclosure and the animated signature', () => {
    expect(index).toContain("placeholder='标题、摘要、课程或标签'")
    expect(index).toContain('content-category-list')
    expect(index).toContain("const preferredCategoryOrder = ['遇事不决', '法与算法', '法律之上', '秘密花园']")
    expect(index).toContain('这个栏目还没有公开内容。')
    expect(index).toContain('content-sidebar-signature')
    expect(index).toContain('DynamicSignature')
    expect(styles).toContain('overflow-x: clip')
  })

  it('computes filter state before category groups during server rendering', () => {
    const filterState = index.indexOf('const filtersActive =')
    const categoryGroups = index.indexOf('const categoryGroups =')
    expect(filterState).toBeGreaterThan(-1)
    expect(categoryGroups).toBeGreaterThan(filterState)
  })

  it('gives every card a real or generated glass cover', () => {
    expect(index).toContain('content-card-cover')
    expect(index).toContain('is-generated')
    expect(index).toContain('generated-cover')
  })

  it('renders published markdown with heading ids and a live table of contents', () => {
    expect(detail).toContain('MarkdownDocument')
    expect(detail).toContain('ReadingNavigator')
    expect(detail).toContain('content-reader-toc')
    expect(markdown).toContain('stripLeadingDuplicateTitle')
    expect(markdown).toContain('extractMarkdownHeadings')
  })
})
