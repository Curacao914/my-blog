import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData, resolvePostProps } from '@/lib/db/SiteDataApi'
import Slug from '..'
import { checkSlugHasOneSlash } from '@/lib/utils/post'
<<<<<<< HEAD
=======
import { isExport } from '@/lib/utils/buildMode'
import { getPriorityPages, prefetchAllBlockMaps } from '@/lib/build/prefetch'
>>>>>>> upstream/main

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
<<<<<<< HEAD
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })

  // 根据slug中的 / 分割成prefix和slug两个字段 ; 例如 article/test
  // 最终用户可以通过  [domain]/[prefix]/[slug] 路径访问，即这里的 [domain]/article/test
  const paths = allPages
    ?.filter(row => checkSlugHasOneSlash(row))
    .map(row => ({
      params: { prefix: row.slug.split('/')[0], slug: row.slug.split('/')[1] }
    }))

  // 增加一种访问路径 允许通过 [category]/[slug] 访问文章
  // 例如文章slug 是 test ，然后文章的分类category是 production
  // 则除了 [domain]/[slug] 以外，还支持分类名访问: [domain]/[category]/[slug]

  return {
    paths: paths,
    fallback: true
=======
  const from = 'slug-paths'
  const { allPages } = await fetchGlobalAllData({ from })

  // Export 模式：全量预生成
  if (isExport()) {
    await prefetchAllBlockMaps(allPages)
    return {
      paths: allPages
        ?.filter(row => checkSlugHasOneSlash(row))
        .map(row => ({
          params: {
            prefix: row.slug.split('/')[0],
            slug: row.slug.split('/')[1]
          }
        })),
      fallback: false
    }
  }

  // ISR 模式：预生成最新10篇（仅两段路径格式）
  const tops = getPriorityPages(allPages)

  await prefetchAllBlockMaps(tops)

  return {
    paths: tops
      .filter(p => checkSlugHasOneSlash(p))
      .map(row => ({
        params: {
          prefix: row.slug.split('/')[0],
          slug: row.slug.split('/')[1]
        }
      })),
    fallback: 'blocking'
>>>>>>> upstream/main
  }
}

export async function getStaticProps({ params: { prefix, slug }, locale }) {
  const props = await resolvePostProps({
    prefix,
    slug,
    locale,
  })

  return {
    props,
<<<<<<< HEAD
    revalidate: process.env.EXPORT
=======
    revalidate: isExport()
>>>>>>> upstream/main
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      ),
<<<<<<< HEAD
=======
    notFound: !props.post
>>>>>>> upstream/main
  }
}

export default PrefixSlug
