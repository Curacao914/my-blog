import { chooseKnowledgeImageCompression } from '@/lib/knowledge/imageCompression'

describe('knowledge image compression policy', () => {
  it('preserves animation and small images', () => {
    expect(chooseKnowledgeImageCompression({
      type: 'image/gif', size: 1900000, width: 1600, height: 900
    })).toEqual({ action: 'keep' })
    expect(chooseKnowledgeImageCompression({
      type: 'image/png', size: 180000, width: 900, height: 600
    })).toEqual({ action: 'keep' })
  })

  it('bounds large screenshots with a high-quality webp target', () => {
    expect(chooseKnowledgeImageCompression({
      type: 'image/png', size: 1800000, width: 4200, height: 2800
    })).toEqual({
      action: 'compress',
      maxDimension: 2560,
      quality: 0.86,
      outputType: 'image/webp'
    })
  })
})
