const fs = require('fs')
const path = require('path')

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('homepage and writing studio polish', () => {
  const home = read('pages/index.js')
  const header = read('components/law-tech/PublicHeader.js')
  const writing = read('components/WritingDesk.js')
  const publishing = read('components/WritingPublishDialog.js')
  const tools = read('pages/tools/index.js')
  const publicationApi = read('pages/api/writing/publication.js')
  const summaryApi = read('pages/api/content/summary.js')

  it('uses real content rather than personal advertising as the homepage focal point', () => {
    expect(home).toContain('FeaturedContent')
    expect(home).toContain('home-feature')
    expect(home).toContain('home-update-list')
    expect(home).toContain('home-category-summary')
    expect(home).not.toContain('郭鑫 / Curacao')
    expect(home).not.toContain('北京大学法学院')
    expect(home).not.toContain('意义有什么意义')
  })

  it('turns the left header area into a useful home and update summary', () => {
    expect(header).toContain('public-home-link')
    expect(header).toContain("name='home'")
    expect(header).toContain("summary || 'law-tech.dev'")
    expect(header).not.toContain("className='brand-mark'")
  })

  it('always sends public tools to the production domain from Preview', () => {
    expect(home).toContain('https://law-tech.dev/ocr/')
    expect(home).toContain('https://law-tech.dev/citation/')
    expect(tools).toContain('https://law-tech.dev/ocr/')
    expect(tools).toContain('https://law-tech.dev/citation/')
  })

  it('keeps save status transient and opens publication settings in place', () => {
    expect(writing).toContain('WritingPublishDialog')
    expect(writing).toContain('openPublishSettings')
    expect(writing).toContain("saveState === 'saving' ? '保存中' : '保存'")
    expect(writing).toContain("current === '已保存' ? '' : current")
    expect(writing).not.toContain("<Link href='/desk/publish'>发布设置</Link>")
  })

  it('publishes writing drafts with metadata and offers AI summaries', () => {
    expect(publishing).toContain('封面图片 URL')
    expect(publishing).toContain('AI 生成')
    expect(publishing).toContain('/api/writing/publication')
    expect(publicationApi).toContain("source: 'manual'")
    expect(publicationApi).toContain("permission: 'writing'")
    expect(summaryApi).toContain('resolveUserAiConfig')
    expect(summaryApi).toContain('70—130 字')
  })
})
