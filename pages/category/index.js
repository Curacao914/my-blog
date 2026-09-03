import { PublicDirectoryPage } from '@/components/content/PublicDirectoryPage'
import { categoryDirectory } from '@/lib/content/directory'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'

export default function CategoryIndex({ groups = [] }) {
  return <PublicDirectoryPage
    eyebrow='Categories'
    title='栏目'
    description='先进入内容所属的领域，再逐步展开合集与具体文章。'
    groups={groups}
  />
}

CategoryIndex.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'public-category-index' })
  return { props: { groups: categoryDirectory(items) }, revalidate: 1800 }
}
