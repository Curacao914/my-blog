jest.mock('next/jest', () => () => config => config)

const config = require('../../jest.config')

describe('Jest configuration', () => {
  it('ignores repository worktrees', () => {
    expect(config.testPathIgnorePatterns).toContain('<rootDir>/.worktrees/')
  })
})
