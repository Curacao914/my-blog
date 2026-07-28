import fs from 'fs'
import path from 'path'

const root = process.cwd()

describe('home light knowledge widget', () => {
  test('loads only the signed-in owner private homepage entries on the client', () => {
    const source = fs.readFileSync(
      path.join(root, 'components/knowledge/HomeKnowledgeWidget.js'),
      'utf8'
    )

    expect(source).toContain("fetch('/api/knowledge?showOnHome=true&limit=3'")
    expect(source).toContain("credentials: 'same-origin'")
    expect(source).toContain("cache: 'no-store'")
    expect(source).toContain('.slice(0, 3)')
    expect(source).not.toContain('getServerSideProps')
    expect(source).not.toContain('getStaticProps')
  })

  test('keeps the public shell useful without rendering private knowledge text', () => {
    const source = fs.readFileSync(
      path.join(root, 'components/knowledge/HomeKnowledgeWidget.js'),
      'utf8'
    )

    expect(source).toContain("const [entries, setEntries] = useState([])")
    expect(source).toContain("href='/desk/knowledge'")
    expect(source).toContain('轻知识')
    expect(source).toContain('正在探索')
  })

  test('places the compact widget beside existing homepage utilities', () => {
    const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')

    expect(home).toContain("import { HomeKnowledgeWidget } from '@/components/knowledge/HomeKnowledgeWidget'")
    expect(home.indexOf('<FocusWidget focus={focus} />')).toBeLessThan(
      home.indexOf('<HomeKnowledgeWidget />')
    )
    expect(home.indexOf('<HomeKnowledgeWidget />')).toBeLessThan(
      home.indexOf('<QuoteWidget settings={home.quote} />')
    )
    expect(home.match(/getStaticProps/g)).toHaveLength(1)
    expect(home).not.toContain('loadKnowledge')
  })
})
