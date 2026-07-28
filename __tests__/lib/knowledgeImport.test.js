import JSZip from 'jszip'
import {
  parseKnowledgeArchive,
  parseKnowledgeFile,
  parseKnowledgeText,
  rewriteKnowledgeAssetReferences
} from '@/lib/knowledge/import'

function fakeFile(name, bytesOrText) {
  const buffer = Buffer.isBuffer(bytesOrText)
    ? bytesOrText
    : Buffer.from(bytesOrText)

  return {
    name,
    async text() {
      return buffer.toString('utf8')
    },
    async arrayBuffer() {
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      )
    }
  }
}

async function zipFile(entries, name = 'knowledge.zip') {
  const zip = new JSZip()
  for (const [entryName, value] of Object.entries(entries)) {
    zip.file(entryName, value)
  }
  const bytes = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'STORE'
  })
  return fakeFile(name, bytes)
}

function markZipEncrypted(buffer) {
  const copy = Buffer.from(buffer)
  for (const [signature, flagOffset] of [
    [0x04034b50, 6],
    [0x02014b50, 8]
  ]) {
    let cursor = 0
    while ((cursor = copy.indexOf(Buffer.from([
      signature & 0xff,
      (signature >> 8) & 0xff,
      (signature >> 16) & 0xff,
      (signature >> 24) & 0xff
    ]), cursor)) !== -1) {
      copy.writeUInt16LE(copy.readUInt16LE(cursor + flagOffset) | 1, cursor + flagOffset)
      cursor += 4
    }
  }
  return copy
}

describe('knowledge file import', () => {
  it('parses Markdown and text files with a title suggestion and no assets', async () => {
    expect(parseKnowledgeText({
      name: 'platform.markdown',
      text: '\uFEFF# 平台责任\n\n正文'
    })).toEqual({
      markdown: '# 平台责任\n\n正文',
      title: '平台责任',
      assets: []
    })

    await expect(parseKnowledgeFile(fakeFile(
      'research notes.txt',
      '第一条观察\n第二条观察'
    ))).resolves.toEqual({
      markdown: '第一条观察\n第二条观察',
      title: 'research notes',
      assets: []
    })

    expect(() => parseKnowledgeText({
      name: 'page.html',
      text: '<h1>unsafe</h1>'
    })).toThrow(expect.objectContaining({
      code: 'unsupported_text_type'
    }))
  })

  it('prefers root index.md, warns about other Markdown, and imports only referenced images', async () => {
    const file = await zipFile({
      'README.md': '# Ignored\n\nDo not merge this body.',
      'index.md': [
        '# 主文档',
        '![示意图](./images/diagram.png)',
        '![远程图](https://example.com/remote.png)',
        '![内嵌图](data:image/png;base64,AAAA)'
      ].join('\n\n'),
      'images/diagram.png': Buffer.from('referenced-image'),
      'images/unused.jpg': Buffer.from('unused-image')
    })

    const result = await parseKnowledgeArchive(file)

    expect(result.title).toBe('主文档')
    expect(result.markdown).toContain('![示意图](images/diagram.png)')
    expect(result.markdown).toContain('https://example.com/remote.png')
    expect(result.markdown).toContain('data:image/png;base64,AAAA')
    expect(result.markdown).not.toContain('Do not merge this body.')
    expect(result.warning).toMatch(/index\.md.*README\.md/i)
    expect(result.assets).toHaveLength(1)
    expect(result.assets[0]).toEqual(expect.objectContaining({
      path: 'images/diagram.png',
      name: 'diagram.png',
      mimeType: 'image/png',
      altText: '示意图',
      sizeBytes: Buffer.byteLength('referenced-image')
    }))
    expect(result.assets[0].dataUrl).toBe(
      `data:image/png;base64,${Buffer.from('referenced-image').toString('base64')}`
    )
  })

  it('chooses the shortest then lexicographically first Markdown path without merging', async () => {
    const result = await parseKnowledgeArchive(await zipFile({
      'z.md': '# Z',
      'a.md': '# A',
      'nested/essay.md': '# Nested'
    }))

    expect(result.title).toBe('A')
    expect(result.markdown).toBe('# A')
    expect(result.warning).toMatch(/a\.md/)
  })

  it('normalizes an image reference relative to the selected Markdown file', async () => {
    const result = await parseKnowledgeArchive(await zipFile({
      'notes/main.md': '# Nested\n\n![证据](../images/evidence.webp)',
      'images/evidence.webp': Buffer.from('webp-image')
    }))

    expect(result.markdown).toContain('![证据](images/evidence.webp)')
    expect(result.assets).toEqual([
      expect.objectContaining({
        path: 'images/evidence.webp',
        mimeType: 'image/webp'
      })
    ])
  })

  it('matches percent-encoded Markdown image paths to upload relative paths with spaces', async () => {
    const assetId = '33333333-3333-4333-8333-333333333333'
    const result = await parseKnowledgeArchive(await zipFile({
      'index.md': [
        '# Encoded',
        '![local](images/a%20b.png)',
        '![remote](https://example.com/a%20b.png)',
        '![inline](data:image/png;base64,AAAA)'
      ].join('\n\n'),
      'images/a b.png': Buffer.from('space-image')
    }))

    expect(result.assets).toEqual([
      expect.objectContaining({
        path: 'images/a b.png'
      })
    ])
    expect(rewriteKnowledgeAssetReferences(result.markdown, [{
      relativePath: result.assets[0].path,
      id: assetId
    }])).toBe([
      '# Encoded',
      `![local](/api/knowledge/assets/${assetId})`,
      '![remote](https://example.com/a%20b.png)',
      '![inline](data:image/png;base64,AAAA)'
    ].join('\n\n'))
  })

  it('rejects file-count, expanded-size, and per-image size limit violations', async () => {
    const tooMany = {}
    for (let index = 0; index < 21; index += 1) {
      tooMany[`note-${index}.md`] = `# ${index}`
    }
    await expect(parseKnowledgeArchive(await zipFile(tooMany))).rejects.toMatchObject({
      code: 'archive_file_limit'
    })

    await expect(parseKnowledgeArchive(await zipFile({
      'index.md': '# Large archive',
      'large.txt': Buffer.alloc(8 * 1024 * 1024, 1),
      'extra.txt': Buffer.from('x')
    }))).rejects.toMatchObject({
      code: 'archive_size_limit'
    })

    await expect(parseKnowledgeArchive(await zipFile({
      'index.md': '# Large image\n\n![large](large.png)',
      'large.png': Buffer.alloc(2 * 1024 * 1024 + 1, 1)
    }))).rejects.toMatchObject({
      code: 'archive_image_limit'
    })
  })

  it.each([
    ['../outside.md', '# traversal', 'archive_unsafe_path'],
    ['/absolute.md', '# absolute', 'archive_unsafe_path'],
    ['.DS_Store', 'metadata', 'archive_system_file'],
    ['script.js', 'alert(1)', 'archive_unsafe_type'],
    ['image.svg', '<svg/>', 'archive_unsafe_type'],
    ['page.html', '<h1>x</h1>', 'archive_unsafe_type']
  ])('rejects unsafe archive entry %s', async (entryName, contents, code) => {
    const file = await zipFile({
      'index.md': '# Main',
      [entryName]: contents
    })

    await expect(parseKnowledgeArchive(file)).rejects.toMatchObject({ code })
  })

  it('rejects encrypted ZIP archives', async () => {
    const plain = await zipFile({ 'index.md': '# Secret' })
    const encryptedBytes = markZipEncrypted(Buffer.from(await plain.arrayBuffer()))

    await expect(parseKnowledgeArchive(
      fakeFile('encrypted.zip', encryptedBytes)
    )).rejects.toMatchObject({
      code: 'archive_encrypted'
    })
  })

  it('rewrites exact relative image uploads without changing links or external images', () => {
    const assetId = '33333333-3333-4333-8333-333333333333'
    const markdown = [
      '![asset](images/a.png)',
      '[ordinary link](images/a.png)',
      '![query](images/a.png?size=2)',
      '![prefix](images/a.png.bak)',
      '![remote](https://example.com/images/a.png)',
      '![inline](data:image/png;base64,AAAA)'
    ].join('\n')

    const rewritten = rewriteKnowledgeAssetReferences(markdown, [
      { path: 'images/a.png', id: assetId }
    ])

    expect(rewritten).toContain(
      `![asset](/api/knowledge/assets/${assetId})`
    )
    expect(rewritten).toContain('[ordinary link](images/a.png)')
    expect(rewritten).toContain('![query](images/a.png?size=2)')
    expect(rewritten).toContain('![prefix](images/a.png.bak)')
    expect(rewritten).toContain('https://example.com/images/a.png')
    expect(rewritten).toContain('data:image/png;base64,AAAA')
  })
})
