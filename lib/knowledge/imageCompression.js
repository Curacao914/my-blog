const COMPRESS_THRESHOLD = 600 * 1024
const MAX_DIMENSION = 2560

export function chooseKnowledgeImageCompression({
  type = '',
  size = 0,
  width = 0,
  height = 0
} = {}) {
  if (
    type === 'image/gif' ||
    size <= COMPRESS_THRESHOLD ||
    (width <= MAX_DIMENSION && height <= MAX_DIMENSION && size <= 900 * 1024)
  ) {
    return { action: 'keep' }
  }
  return {
    action: 'compress',
    maxDimension: MAX_DIMENSION,
    quality: 0.86,
    outputType: 'image/webp'
  }
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败'))
    image.src = dataUrl
  })
}

export async function compressKnowledgeImage(asset) {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return asset
  }
  const image = await loadImage(asset.dataUrl)
  const policy = chooseKnowledgeImageCompression({
    type: asset.mimeType,
    size: asset.sizeBytes,
    width: image.naturalWidth,
    height: image.naturalHeight
  })
  if (policy.action === 'keep') return asset

  const scale = Math.min(
    1,
    policy.maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.getContext('2d', { alpha: false }).drawImage(
    image, 0, 0, canvas.width, canvas.height
  )
  const dataUrl = canvas.toDataURL(policy.outputType, policy.quality)
  const sizeBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
  if (sizeBytes >= asset.sizeBytes) return asset
  return {
    ...asset,
    name: asset.name.replace(/\.[^.]+$/, '.webp'),
    dataUrl,
    mimeType: policy.outputType,
    sizeBytes
  }
}
