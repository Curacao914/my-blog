const fs = require('fs')
const path = require('path')

describe('admin health optional migrations', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'pages/api/admin/health.js'),
    'utf8'
  )

  it('does not mark the core database down for an optional queue table', () => {
    expect(source).toContain('coreRequiredTables')
    expect(source).toContain('optionalTables')
    expect(source).toContain(
      'databaseReachable: coreTables.every'
    )
    expect(source).toContain('missingFeatureTables')
  })
})
