const STATIC_PREFIXES = new Set([
  'fonts',
  'font',
  'css',
  'js',
  'images',
  'image',
  'assets',
  'static',
  'favicon.ico',
  'robots.txt'
])

export function shouldSkipNotionRoute(prefix = '') {
  return STATIC_PREFIXES.has(String(prefix || '').toLowerCase())
}
