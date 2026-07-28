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
  return <>
    <Link className={`knowledge-capture-link ${className}`.trim()} href={`/desk/knowledge?${params.toString()}`}>{children}</Link>
    <style jsx>{`
      .knowledge-capture-link{display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(17,63,49,.1);border-radius:9px;padding:6px 9px;color:var(--leaf);background:rgba(255,255,255,.48);font-size:9px;line-height:1.2}
      .knowledge-capture-link:hover{border-color:rgba(17,63,49,.22);background:rgba(255,255,255,.8)}
    `}</style>
  </>
}
