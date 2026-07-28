import Link from 'next/link'

export function KnowledgeCaptureLink({
  sourceType,
  sourceId,
  sourceTitle = '',
  seed = '',
  className = '',
  children = '转为轻知识'
}) {
  if (!sourceType || !sourceId) return null
  const params = new URLSearchParams({
    new: '1',
    sourceType: String(sourceType),
    sourceId: String(sourceId)
  })
  if (sourceTitle) params.set('sourceTitle', sourceTitle)
  if (seed) params.set('seed', seed)
  return (
    <Link
      className={`knowledge-capture-link ${className}`.trim()}
      href={`/desk/knowledge?${params.toString()}`}
    >
      {children}
    </Link>
  )
}
