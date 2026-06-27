import { PublicDirectoryPage } from '@/components/content/PublicDirectoryPage'
import { archiveDirectory } from '@/lib/content/directory'
import { loadPublicContentIndex } from '@/lib/content/publicIndex'

export default function ArchivePage({ groups = [] }) {
  return <PublicDirectoryPage
    eyebrow='Archive'
    title='时间归档'
    description='按更新时间回看文章、课程笔记与项目，沿着写作与学习的轨迹逐年展开。'
    groups={groups}
  />
}

ArchivePage.layout = 'bare'

export async function getStaticProps() {
  const { items } = await loadPublicContentIndex({ from: 'public-archive' })
  return { props: { groups: archiveDirectory(items) }, revalidate: 1800 }
}
