import { PublicDirectoryPage } from '@/components/content/PublicDirectoryPage'
import { tagDirectory } from '@/lib/content/directory'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'

export default function TagIndex({ groups = [] }) {
  return <PublicDirectoryPage
    eyebrow='Tags'
    title='标签'
    description='标签用于横向连接不同栏目中的共同主题，数量多时按使用频率排列。'
    groups={groups}
  />
}

TagIndex.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'public-tag-index' })
  return { props: { groups: tagDirectory(items) }, revalidate: 1800 }
}
