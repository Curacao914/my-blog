const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const home = fs.readFileSync(path.join(root, 'pages/index.js'), 'utf8')

describe('homepage editorial v3', () => {
  it('replaces the failed system billboard with a calmer editorial homepage', () => {
    expect(home).toContain('home-editorial-v3')
    expect(home).toContain('home-editorial-hero')
    expect(home).toContain('home-editorial-board')
    expect(home).not.toContain('home-revolution-v2')
    expect(home).not.toContain('home-system-panel')
    expect(home).not.toContain('home-system-status')
  })

  it('keeps direct navigation without returning to the old card wall', () => {
    expect(home).toContain('home-entry-grid')
    expect(home).toContain('home-topic-path')
    expect(home).toContain('home-recent-line')
    expect(home).not.toContain('home-dashboard')
    expect(home).not.toContain('home-feature')
    expect(home).not.toContain('home-topic-card')
  })

  it('removes generated cover logic from the homepage', () => {
    expect(home).not.toContain('publicContentStableHue')
    expect(home).not.toContain('generated-cover')
    expect(home).not.toContain('home-feature-cover')
  })
})
