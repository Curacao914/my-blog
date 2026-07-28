import fs from 'fs'
import path from 'path'

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('light knowledge workbench surfaces', () => {
  it('protects both knowledge pages with the dedicated permission and shared desk shell', () => {
    const indexPage = read('pages/desk/knowledge/index.js')
    const detailPage = read('pages/desk/knowledge/[id].js')

    for (const source of [indexPage, detailPage]) {
      expect(source).toContain("requireDeskPage({ permission: 'knowledge' })")
      expect(source).toContain("active='knowledge'")
      expect(source).toContain('<LawTechDeskStyles />')
      expect(source).toContain('<KnowledgeStyles />')
    }
  })

  it('keeps acquisition external-model-first and supports current Markdown import formats', () => {
    const source = read('components/knowledge/KnowledgeDesk.js')

    expect(source).toContain('buildKnowledgePrompt')
    expect(source).toContain('parseKnowledgeFile')
    expect(source).toContain("accept='.md,.markdown,.txt,.zip'")
    expect(source).toContain('复制提示词')
    expect(source).toContain('导入结果')
    expect(source).not.toContain('/api/dify-chat')
    expect(source).not.toContain('/api/settings/ai')
    expect(source).not.toContain('resolveUserAiConfig')
  })

  it('creates the text first, uploads referenced private images, then patches rewritten Markdown', () => {
    const source = read('components/knowledge/KnowledgeDesk.js')

    expect(source).toContain("fetch('/api/knowledge'")
    expect(source).toContain("fetch('/api/knowledge/assets'")
    expect(source).toContain('rewriteKnowledgeAssetReferences')
    expect(source).toContain("method: 'PATCH'")
    expect(source).toContain("router.push(`/desk/knowledge/${saved.id}`)")
  })

  it('reuses the Markdown reader and offers restrained lifecycle actions on detail', () => {
    const source = read('components/knowledge/KnowledgeDetail.js')

    expect(source).toContain('<MarkdownDocument')
    expect(source).toContain('编辑')
    expect(source).toContain('归档')
    expect(source).toContain('发展为写作')
    expect(source).toContain("/api/notes?scope=writing")
    expect(source).not.toContain('知识图谱')
  })

  it('uses a separate responsive style surface instead of growing the legacy desk stylesheet', () => {
    const source = read('components/knowledge/KnowledgeStyles.js')

    expect(source).toContain('.knowledge-workspace')
    expect(source).toContain('.knowledge-composer')
    expect(source).toMatch(/@media\s*\(max-width:\s*900px\)/)
    expect(source).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })
})
