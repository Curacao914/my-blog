const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const contentDetail = fs.readFileSync(path.join(root, 'pages/content/[...slug].js'), 'utf8')

describe('public content reading flow', () => {
  it('moves content detail to the reading v2 layout', () => {
    expect(contentDetail).toContain('content-reading-v2')
    expect(contentDetail).toContain('content-reading-frame')
    expect(contentDetail).toContain('content-reading-hero')
    expect(contentDetail).toContain('content-reading-body')
    expect(contentDetail).not.toContain('content-reader-layout')
    expect(contentDetail).not.toContain('content-reader-meta')
  })

  it('keeps reading navigation and route continuity', () => {
    expect(contentDetail).toContain("<PublicHeader active='content'")
    expect(contentDetail).toContain('content-reading-breadcrumbs')
    expect(contentDetail).toContain('content-reading-meta-row')
    expect(contentDetail).toContain("className='content-reading-nav'")
    expect(contentDetail).toContain("<Link href='/content'>回到内容库</Link>")
  })

  it('preserves access control and live content data paths', () => {
    expect(contentDetail).toContain('PasswordGate')
    expect(contentDetail).toContain("fetch('/api/content/access'")
    expect(contentDetail).toContain('getPublishedContentBySlug')
    expect(contentDetail).toContain('getLiveContentBySlug')
    expect(contentDetail).toContain("content.access?.mode === 'private'")
  })
})
