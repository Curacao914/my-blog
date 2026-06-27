const fs = require('fs')
const path = require('path')

describe('content management loading', () => {
  const management = fs.readFileSync(path.join(process.cwd(), 'lib/contentManagement.js'), 'utf8')
  const api = fs.readFileSync(path.join(process.cwd(), 'pages/api/content/manage.js'), 'utf8')
  const repository = fs.readFileSync(path.join(process.cwd(), 'lib/contentRepository.js'), 'utf8')

  it('bulk-loads related content rows instead of making three requests per item', () => {
    expect(management).toContain("const itemFilter = `item_id=in.(${items.map(item => item.id).join(',')})`")
    expect(management).toContain('const [versions, accessRows, displayRows, assets] = await Promise.all')
    expect(management).toContain('&${itemFilter}&order=version.desc')
    expect(management).not.toContain('for (const item of items || [])')
    expect(repository).toContain("const itemFilter = `item_id=in.(${items.map(item => item.id).join(',')})`")
  })

  it('caches the expensive Notion taxonomy on warm serverless instances', () => {
    expect(api).toContain('NOTION_TAXONOMY_TTL_MS')
    expect(api).toContain('notionTaxonomyCache')
  })
})
