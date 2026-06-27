import { PublicDirectoryPage } from '@/components/content/PublicDirectoryPage'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'
import { publicContentCategory } from '@/lib/content/publicContent'

export default function CategoryPage({ category = '', items = [] }) {
  return <PublicDirectoryPage
    eyebrow='Category'
    title='栏目'
    description='同一栏目的文章、课程笔记与项目集中在这里。'
    selectedLabel={category}
    items={items}
  />
}

CategoryPage.layout = 'bare'

export async function getStaticProps({ params }) {
  const category = String(params?.category || '')
  const { items } = await loadPublicContentIndex({ from: 'public-category-detail' })
  return {
    props: { category, items: items.filter(item => publicContentCategory(item) === category) },
    revalidate: 1800
  }
}

export async function getStaticPaths() {
  const { items } = await loadPublicContentIndex({ from: 'public-category-paths' })
  const categories = [...new Set(items.map(publicContentCategory).filter(Boolean))]
  return { paths: categories.map(category => ({ params: { category } })), fallback: 'blocking' }
}
