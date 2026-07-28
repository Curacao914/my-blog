const fs = require('fs')
const path = require('path')
const { deskNav, objectTypes } = require('../../lib/domain/navigation')

describe('light knowledge navigation skeleton', () => {
  const deskShell = fs.readFileSync(
    path.join(process.cwd(), 'components/DeskShell.js'),
    'utf8'
  )
  const icons = fs.readFileSync(
    path.join(process.cwd(), 'components/LawTechIcons.js'),
    'utf8'
  )

  it('puts the light knowledge entry first in the learning group', () => {
    const learning = deskNav.find(group => group.group === '学习')

    expect(learning.items[0]).toEqual({
      key: 'knowledge',
      label: '轻知识',
      href: '/desk/knowledge'
    })
  })

  it('maps navigation visibility to the knowledge permission', () => {
    expect(deskShell).toContain("knowledge: 'knowledge'")
  })

  it('registers the knowledge object type and its restrained icon', () => {
    expect(objectTypes).toContain('knowledge')
    expect(icons).toMatch(/knowledge:\s*<>/)
  })
})
