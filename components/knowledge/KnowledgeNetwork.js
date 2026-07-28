import Link from 'next/link'

function groupEntries(entries = []) {
  const domains = new Map()
  for (const entry of entries) {
    const domain = entry.domain || '未分类'
    const topic = entry.topic || '其他'
    if (!domains.has(domain)) domains.set(domain, new Map())
    const topics = domains.get(domain)
    if (!topics.has(topic)) topics.set(topic, [])
    topics.get(topic).push(entry)
  }
  return [...domains].map(([domain, topics]) => ({
    domain,
    topics: [...topics].map(([topic, items]) => ({ topic, items }))
  }))
}

export function KnowledgeNetwork({ entries = [], links = [] }) {
  const tree = groupEntries(entries)
  const entriesById = new Map(entries.map(entry => [entry.id, entry]))
  const linksBySource = new Map()
  for (const link of links) {
    if (!linksBySource.has(link.sourceId)) linksBySource.set(link.sourceId, [])
    linksBySource.get(link.sourceId).push(link)
  }
  return (
    <div className='knowledge-network' aria-label='知识网络'>
      {tree.map(branch => (
        <section key={branch.domain}>
          <strong>{branch.domain}</strong>
          <div>
            {branch.topics.map(topic => (
              <article key={topic.topic}>
                <b>{topic.topic}</b>
                <span>
                  {topic.items.map(item => {
                    const related = (linksBySource.get(item.id) || [])
                      .map(link => entriesById.get(link.targetId)?.title)
                      .filter(Boolean)
                    return (
                      <Link href={`/desk/knowledge/${item.id}`} key={item.id}>
                        <em>{item.title}</em>
                        {related.length ? <small>↔ {related.join('、')}</small> : null}
                      </Link>
                    )
                  })}
                </span>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
