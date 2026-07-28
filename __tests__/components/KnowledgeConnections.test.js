import fs from 'fs'
import path from 'path'

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('knowledge connections and module flow', () => {
  it('exposes owner-scoped relation APIs with rule suggestions and user decisions', () => {
    const route = read('pages/api/knowledge/[id]/relations.js')
    const repository = read('lib/server/knowledgeRelations.js')

    expect(route).toContain("permission: 'knowledge'")
    expect(route).toContain('refreshKnowledgeSuggestions')
    expect(route).toContain('createKnowledgeRelation')
    expect(route).toContain('updateKnowledgeRelation')
    expect(repository).toContain('owner_id=')
    expect(repository).toContain("origin: 'rule'")
    expect(repository).toContain("status: 'suggested'")
  })

  it('keeps manual review for legacy suggestions while AI owns new organization', () => {
    const source = read('components/knowledge/KnowledgeDetail.js')
    const network = read('components/knowledge/KnowledgeNetwork.js')

    expect(source).toContain('/relations')
    expect(source).toContain('确认')
    expect(source).toContain('忽略')
    expect(source).toContain('/api/knowledge/organize')
    expect(source).not.toContain('添加关联')
    expect(network).toContain('linksBySource')
    expect(network).toContain('↔')
  })

  it('adds one reusable capture link to existing modules without duplicating stores', () => {
    const link = read('components/knowledge/KnowledgeCaptureLink.js')
    expect(link).toContain('/desk/knowledge?')
    expect(link).toContain('sourceType')
    expect(link).toContain('sourceId')

    for (const file of [
      'components/NotesDesk.js',
      'components/ReadingBox.js',
      'components/CourseNoteReader.js',
      'components/TodayBoard.js'
    ]) {
      expect(read(file)).toContain('KnowledgeCaptureLink')
    }
  })
})
