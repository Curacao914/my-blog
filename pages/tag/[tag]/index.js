import { PublicDirectoryPage } from '@/components/content/PublicDirectoryPage'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import { publicContentTags } from '@/lib/content/publicContent'

export default function TagPage({ tag = '', items = [] }) {
  return <PublicDirectoryPage
    eyebrow='Tag'
    title='标签'
    description='这个标签连接了不同来源与栏目的内容。'
    selectedLabel={tag}
    items={items}
  />
}

TagPage.layout = 'bare'

export async function getStaticProps({ params }) {
  const tag = String(params?.tag || '')
  const { items } = await loadPublicContentIndex({ from: 'public-tag-detail' })
  return {
    props: { tag, items: items.filter(item => publicContentTags(item).includes(tag)) },
    revalidate: 1800
  }
}

export async function getStaticPaths() {
  const { items } = await loadPublicContentIndex({ from: 'public-tag-paths' })
  const tags = [...new Set(items.flatMap(publicContentTags).filter(Boolean))]
  return { paths: tags.map(tag => ({ params: { tag } })), fallback: 'blocking' }
}
