const fs = require('fs')
const path = require('path')

const home = fs.readFileSync(path.join(process.cwd(), 'pages/index.js'), 'utf8')

describe('homepage surface polish', () => {
  it('keeps the public homepage on the lighter surface system', () => {
    expect(home).toContain('homepage-surface-polish-v1')
    expect(home).toContain('grid-template-columns:minmax(0,1.05fr) minmax(290px,.72fr)')
    expect(home).toContain('min-height:312px')
    expect(home).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
  })

  it('removes the heaviest previous homepage proportions', () => {
    expect(home).not.toContain('grid-template-columns:minmax(0,1.42fr) minmax(310px,.58fr)')
    expect(home).not.toContain('min-height:390px')
    expect(home).not.toContain('flex:0 0 152px')
    expect(home).not.toContain('backdrop-filter:blur(22px) saturate(1.06)')
  })

  it('keeps topic cards visually differentiated instead of relying on one repeated template', () => {
    expect(home).toContain('.home-topic-card:nth-child(2)')
    expect(home).toContain('.home-topic-card:nth-child(3)')
    expect(home).toContain('.home-topic-card:nth-child(4)')
  })
})
