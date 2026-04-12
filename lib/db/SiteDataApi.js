import BLOG from '@/blog.config'
import { getOrSetDataWithCache } from '../cache/cache_manager'
import { getAllCategories } from '@/lib/db/notion/getAllCategories'
import getAllPageIds from '@/lib/db/notion/getAllPageIds'
import { getAllTags } from '@/lib/db/notion/getAllTags'
import { getConfigMapFromConfigPage } from '@/lib/db/notion/getNotionConfig'
import getPageProperties, {
  adjustPageProperties
} from '@/lib/db/notion/getPageProperties'
<<<<<<< HEAD
import { fetchInBatches, fetchNotionPageBlocks, formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
=======
import {
  fetchInBatches,
  fetchNotionPageBlocks,
  formatNotionBlock
} from '@/lib/db/notion/getPostBlocks'
>>>>>>> upstream/main
import { compressImage, mapImgUrl } from '@/lib/db/notion/mapImage'
import { deepClone } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import { siteConfig } from '../config'
import { extractLangId, extractLangPrefix, getShortId } from '../utils/pageId'
<<<<<<< HEAD
import { normalizeNotionMetadata, normalizeCollection, normalizeSchema, normalizePageBlock } from './notion/normalizeUtil'

import { fetchPageFromNotion } from './notion/getNotionPost'
import { processPostData } from '../utils/post'
import { adapterNotionBlockMap } from '../utils/notion.util'
=======
import {
  normalizeNotionMetadata,
  normalizeCollection,
  normalizeSchema,
  normalizePageBlock
} from './notion/normalizeUtil'
import { fetchPageFromNotion } from './notion/getNotionPost'
import { processPostData } from '../utils/post'
import { adapterNotionBlockMap } from '../utils/notion.util'
// import pLimit from 'p-limit'
>>>>>>> upstream/main

export { getAllTags } from './notion/getAllTags'
export { fetchPageFromNotion as getPost } from './notion/getNotionPost'
export { fetchNotionPageBlocks as getPostBlocks } from './notion/getPostBlocks'

/**
<<<<<<< HEAD
 * 获取全站数据; 基于Notion实现
 * TODO 计划这个文件改成类似Restful的接口形式；
 * 按照站点数据封装，从而进一步提升兼容性和可维护性
 * @see /lib/site/site.api.ts
 * /site-info
 * /posts?tag=xxx&category=yyy&page=1&limit=10
 * /posts/:id
 * /categories
 * /tags
 * @param {*} pageId
 * @param {*} from
 * @param {*} locale 语言  zh|en|jp 等等
 * @returns
 *
=======
 * 获取全站数据；基于 Notion 实现
 * 支持多站点（pageId 逗号分隔）和多语言（locale 前缀）
>>>>>>> upstream/main
 */
export async function fetchGlobalAllData({
  pageId = BLOG.NOTION_PAGE_ID,
  from,
  locale
}) {
<<<<<<< HEAD
  // 获取站点数据 ， 如果pageId有逗号隔开则分次取数据
=======
>>>>>>> upstream/main
  const siteIds = pageId?.split(',') || []
  let data = EmptyData(pageId)

  if (BLOG.BUNDLE_ANALYZER) {
    return data
  }

<<<<<<< HEAD
=======
  // 全站总耗时开始
  // const globalStart = Date.now()
  // console.log(`🕒 开始获取全站数据: ${siteIds.length} 个站点`)

>>>>>>> upstream/main
  try {
    for (let index = 0; index < siteIds.length; index++) {
      const siteId = siteIds[index]
      const id = extractLangId(siteId)
      const prefix = extractLangPrefix(siteId)
<<<<<<< HEAD
      // 第一个id站点默认语言
      if (index === 0 || locale === prefix) {
        data = await getSiteDataByPageId({
          pageId: id,
          from
        })
      }
=======

      // 每个站点耗时开始
      // const siteStart = Date.now()
      // console.log(`➡️ 开始获取站点数据: ${siteId}`)

      if (index === 0 || locale === prefix) {
        data = await getSiteDataByPageId({ pageId: id, from })
      }

      // const siteEnd = Date.now()
      // console.log(`✅ 完成站点: ${siteId}，耗时: ${(siteEnd - siteStart)}ms`)
>>>>>>> upstream/main
    }
  } catch (error) {
    console.error('异常', error)
  }

<<<<<<< HEAD
  // 返回给客户端前的清理操作
=======
  // const globalEnd = Date.now()
  // console.log(`🏁 全站数据获取完成，总耗时: ${(globalEnd - globalStart)}ms`)

>>>>>>> upstream/main
  return handleDataBeforeReturn(deepClone(data))
}

/**
<<<<<<< HEAD
 * 获取指定notion的collection数据
 * @param pageId
 * @param from 请求来源
 * @returns {Promise<JSX.Element|*|*[]>}
 */
export async function getSiteDataByPageId({ pageId, from }) {
  // 获取NOTION原始数据，此接支持mem缓存。
  const originalPageRecordMap = await getOrSetDataWithCache(
    `site_data_${pageId}`,
    async (pageId, from) => {
      const pageRecordMap = await fetchNotionPageBlocks(pageId, from)
      return pageRecordMap
    },
    pageId,
    from
  )

  // 获取的数据格式与站点不同
  return convertNotionToSiteData(pageId, from, deepClone(originalPageRecordMap))
}

/**
 * 获取公告
=======
 * 获取指定 Notion collection 数据
 * 带防击穿缓存：同一 pageId 并发时只发一次 API 请求
 */
export async function getSiteDataByPageId({ pageId, from }) {
  // const siteStart = Date.now()

  const cacheKey = `site_${pageId}`

  return getOrSetDataWithCache(cacheKey,
    async () => {
      console.log('获取全站数据 ', pageId)
      // 拉取数据
      const originalPageRecordMap = await fetchNotionPageBlocks(pageId, from)
      // 转换格式
      const r = await convertNotionToSiteData(pageId, from, deepClone(originalPageRecordMap))
      // 返回并塞入缓存
      return r
    }

  )

  // const originalPageRecordMap = await promise
  // const siteEnd = Date.now()
  // console.log(`⏱ [Notion API] 站点 ${pageId} 耗时: ${siteEnd - siteStart}ms`)
  // return convertNotionToSiteData(pageId, from, deepClone(originalPageRecordMap))


}

/**
 * 获取公告 block
 * 拉取后必须经过 adapter + format，否则新格式双层嵌套导致 type undefined
>>>>>>> upstream/main
 */
async function getNotice(post) {
  if (!post) return null

  try {
    const rawBlockMap = await fetchNotionPageBlocks(post.id, 'data-notice')
<<<<<<< HEAD

    // ✅ 必须经过 adapter 拍平结构，否则新格式的双层嵌套会导致 type undefined
    const adapted = adapterNotionBlockMap(rawBlockMap)

    // ✅ 再清理 crdt_data 等 react-notion-x 不认识的字段
=======
    const adapted = adapterNotionBlockMap(rawBlockMap)
>>>>>>> upstream/main
    post.blockMap = {
      ...adapted,
      block: formatNotionBlock(adapted.block)
    }
  } catch (e) {
    console.warn('[getNotice] fetchNotionPageBlocks failed:', post.id, e)
    post.blockMap = null
  }

  return post
}

<<<<<<< HEAD

/**
 * 空的默认数据
 * @param {*} pageId
 * @returns
 */
const EmptyData = pageId => {
  const empty = {
    notice: null,
    siteInfo: getSiteInfo({}),
    allPages: [
      {
        id: 1,
        title: `无法获取Notion数据，请检查Notion_ID： \n 当前 ${pageId}`,
        summary:
          '访问文档获取帮助 → https://docs.tangly1024.com/article/vercel-deploy-notion-next',
        status: 'Published',
        type: 'Post',
        slug: 'oops',
        publishDay: '2024-11-13',
        pageCoverThumbnail: BLOG.HOME_BANNER_IMAGE || '/bg_image.jpg',
        date: {
          start_date: '2023-04-24',
          lastEditedDay: '2023-04-24',
          tagItems: []
        }
      }
    ],
    allNavPages: [],
    collection: [],
    collectionQuery: {},
    collectionId: null,
    collectionView: {},
    viewIds: [],
    block: {},
    schema: {},
    tagOptions: [],
    categoryOptions: [],
    rawMetadata: {},
    customNav: [],
    customMenu: [],
    postCount: 1,
    pageIds: [],
    latestPosts: []
  }
  return empty
}

/**
 * 在服务端解析 post 相关 props
 * ✅ 兼容 prefix / slug / suffix 任意组合
 * ⚠️ 只能在 getStaticProps / getServerSideProps 使用
 */
/**
 * 生产级稳定版本
 * 严格精确匹配，不做模糊匹配
 */
export async function resolvePostProps({
  prefix,
  slug,
  suffix,
  locale,
  from,
}) {
  /**
   * 1️⃣ 统一路径
   */
  const segments = []
  if (prefix) segments.push(prefix)
  if (slug) segments.push(slug)
  if (Array.isArray(suffix)) segments.push(...suffix)

  const fullSlug = segments.join('/')
  const lastSegment = segments[segments.length - 1]
  const source = from || `slug-props-${fullSlug}`

  /**
   * 2️⃣ 拉全局数据
   */
  const props = await fetchGlobalAllData({ from: source, locale })

  let post = null

  /**
   * 3️⃣ 一级匹配：完整 slug 精确匹配（核心）
   */
  if (fullSlug) {
    post = props?.allPages?.find(p => {
      if (!p || p?.type?.includes('Menu')) return false
      return p.slug === fullSlug
    })
  }

  /**
   * 4️⃣ 二级匹配：完整 UUID 精确匹配
   */
  if (!post && fullSlug) {
    post = props?.allPages?.find(p => {
      return p?.id === fullSlug
    })
  }

  /**
   * 5️⃣ 三级匹配：如果最后一段是 UUID，直接拉 Notion
   */
  if (
    !post &&
    typeof lastSegment === 'string' &&
    /^[a-f0-9-]{32,36}$/i.test(lastSegment)
  ) {
    try {
      post = await fetchPageFromNotion(lastSegment)
    } catch (e) {
      console.warn('[resolvePostProps] fetchPageFromNotion failed:', lastSegment, e)
    }
  }

  /**
   * 6️⃣ 如果拿到了 post，但没有 blockMap，则拉 block
   */
  if (post?.id && !post?.blockMap) {
    try {
      const rawBlockMap = await fetchNotionPageBlocks(post.id, source)

      post.blockMap = adapterNotionBlockMap(rawBlockMap)

      post.blockMap = {
        ...post.blockMap,
        block: formatNotionBlock(post.blockMap.block)
      }

    } catch (e) {
      console.warn('[resolvePostProps] fetchNotionPageBlocks failed:', post.id, e)
    }
  }

  /**
   * 7️⃣ 后处理
   */
  if (post) {
    props.post = post
    try {
      await processPostData(props, source)
    } catch (e) {
      console.warn('[resolvePostProps] processPostData failed', e)
    }
=======
/**
 * 空的默认数据（Notion 拉取失败时的兜底）
 */
const EmptyData = pageId => ({
  notice: null,
  siteInfo: getSiteInfo({}),
  allPages: [
    {
      id: 1,
      title: `无法获取Notion数据，请检查Notion_ID： \n 当前 ${pageId}`,
      summary:
        '访问文档获取帮助 → https://docs.tangly1024.com/article/vercel-deploy-notion-next',
      status: 'Published',
      type: 'Post',
      slug: 'oops',
      publishDay: '2024-11-13',
      pageCoverThumbnail: BLOG.HOME_BANNER_IMAGE || '/bg_image.jpg',
      date: {
        start_date: '2023-04-24',
        lastEditedDay: '2023-04-24',
        tagItems: []
      }
    }
  ],
  allNavPages: [],
  collection: [],
  collectionQuery: {},
  collectionId: null,
  collectionView: {},
  viewIds: [],
  block: {},
  schema: {},
  tagOptions: [],
  categoryOptions: [],
  rawMetadata: {},
  customNav: [],
  customMenu: [],
  postCount: 1,
  pageIds: [],
  latestPosts: []
})
/**
 * 在服务端解析单篇文章的 props
 * 兼容 prefix / slug / suffix 任意组合
 * 只能在 getStaticProps / getServerSideProps 中使用
 */
export async function resolvePostProps({ prefix, slug, suffix, locale, from }) {
  const segments = [prefix, slug].filter(Boolean)
  if (Array.isArray(suffix)) segments.push(...suffix)
  const fullSlug = segments.join('/')
  const lastSegment = segments.at(-1)
  const source = from || `slug-props-${fullSlug}`
  const taskId = `${fullSlug || lastSegment}-${Date.now()}` // 当前任务唯一标识

  const startTime = Date.now()
  console.log(`[${taskId}] 🕒 开始解析文章: ${fullSlug || lastSegment} @ ${new Date().toISOString()}`)

  // 拉全站数据
  const step1Start = Date.now()
  const props = await fetchGlobalAllData({ from: source, locale })
  const step1End = Date.now()
  console.log(`[${taskId}] ⏱ fetchGlobalAllData 耗时: ${step1End - step1Start}ms @ ${new Date().toISOString()}`)

  // 工具函数：查找文章
  const findPost = () => {
    if (!props?.allPages) return null
    return (
      // 1. 完整 slug 匹配
      props.allPages.find(p => p && !p.type?.includes('Menu') && p.slug === fullSlug) ||
      // 2. UUID 匹配
      props.allPages.find(p => p?.id === fullSlug) ||
      null
    )
  }

  let post
  // const step2Start = Date.now()
  post = findPost()
  // const step2End = Date.now()
  // console.log(`[${taskId}] ⏱ 查找文章耗时: ${step2End - step2Start}ms @ ${new Date().toISOString()}`)

  // 3. 最后一段是 UUID，直接拉 Notion
  if (!post && typeof lastSegment === 'string' && /^[a-f0-9-]{32,36}$/i.test(lastSegment)) {
    const step3Start = Date.now()
    try {
      post = await fetchPageFromNotion(lastSegment)
    } catch (e) {
      console.warn(`[${taskId}] [resolvePostProps] fetchPageFromNotion failed:`, lastSegment, e)
    }
    const step3End = Date.now()
    console.log(`[${taskId}] ⏱ fetchPageFromNotion 耗时: ${step3End - step3Start}ms @ ${new Date().toISOString()}`)
  }

  // 封装 block 拉取 + 适配逻辑
  const ensureBlockMap = async (post) => {
    if (!post?.id || post?.blockMap) return post
    const step4Start = Date.now()
    try {
      const rawBlockMap = await fetchNotionPageBlocks(post.id, source)
      const adapted = adapterNotionBlockMap(rawBlockMap)
      post.blockMap = {
        ...adapted,
        block: formatNotionBlock(adapted.block)
      }
    } catch (e) {
      console.warn(`[${taskId}] [resolvePostProps] fetchNotionPageBlocks failed:`, post.id, e)
    }
    const step4End = Date.now()
    console.log(`[${taskId}] ⏱ ensureBlockMap 耗时: ${step4End - step4Start}ms @ ${new Date().toISOString()}`)
    return post
  }

  if (post) {
    post = await ensureBlockMap(post)
    props.post = post
    // const step5Start = Date.now()
    try {
      await processPostData(props, source)
    } catch (e) {
      console.warn(`[${taskId}] [resolvePostProps] processPostData failed`, e)
    }
    // const step5End = Date.now()
    // console.log(`[${taskId}] ⏱ processPostData 耗时: ${step5End - step5Start}ms @ ${new Date().toISOString()}`)
>>>>>>> upstream/main
  } else {
    props.post = null
  }

  delete props.allPages
<<<<<<< HEAD

  return props
}


/**
 * 将Notion数据转站点数据
 * 这里统一对数据格式化
 * @returns {Promise<JSX.Element|null|*>}
 */
async function convertNotionToSiteData(SITE_DATABASE_PAGE_ID, from, pageRecordMap) {
  if (!pageRecordMap) {
    console.error('can`t get Notion Data ; Which id is: ', SITE_DATABASE_PAGE_ID)
    return {}
  }
  SITE_DATABASE_PAGE_ID = idToUuid(SITE_DATABASE_PAGE_ID)
  let block = pageRecordMap.block || {}
  const rawMetadata = normalizeNotionMetadata(block, SITE_DATABASE_PAGE_ID)
  // spaceId 提取备用
  const spaceId = rawMetadata?.space_id || null
  // Check Type Page-Database和Inline-Database
  if (
    rawMetadata?.type !== 'collection_view_page' &&
    rawMetadata?.type !== 'collection_view'
  ) {
    console.error(`pageId "${SITE_DATABASE_PAGE_ID}" is not a database`)
    return EmptyData(SITE_DATABASE_PAGE_ID)
  }

  // 解析读取根数据库信息
=======
  const endTime = Date.now()
  console.log(`[${taskId}] ✅ 完成解析文章: ${fullSlug || lastSegment}, 总耗时: ${endTime - startTime}ms @ ${new Date().toISOString()}`)

  return props
}
async function convertNotionToSiteData(
  SITE_DATABASE_PAGE_ID,
  from,
  pageRecordMap
) {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const overallStart = Date.now()
  console.log(`[${traceId}] 🕒 开始 convertNotionToSiteData from: ${from} @ ${new Date().toISOString()}`)

  if (!pageRecordMap) {
    console.error(`[${traceId}] can't get Notion Data ; pageId:`, SITE_DATABASE_PAGE_ID)
    return {}
  }

  // const stepStart1 = Date.now()
  SITE_DATABASE_PAGE_ID = idToUuid(SITE_DATABASE_PAGE_ID)
  // const stepEnd1 = Date.now()
  // console.log(`[${traceId}] ⏱ UUID 转换耗时: ${stepEnd1 - stepStart1}ms @ ${new Date().toISOString()}`)

  // ── 原始 block，格式统一 ──
  const stepStart2 = Date.now()
  let block = adapterNotionBlockMap({ block: pageRecordMap.block || {} }).block
  const stepEnd2 = Date.now()
  console.log(`[${traceId}] ⏱ adapterNotionBlockMap 耗时: ${stepEnd2 - stepStart2}ms @ ${new Date().toISOString()}`)

  // const stepStart3 = Date.now()
  const rawMetadata = normalizeNotionMetadata(block, SITE_DATABASE_PAGE_ID)
  // const stepEnd3 = Date.now()
  // console.log(`[${traceId}] ⏱ normalizeNotionMetadata 耗时: ${stepEnd3 - stepStart3}ms @ ${new Date().toISOString()}`)

  if (rawMetadata?.type !== 'collection_view_page' && rawMetadata?.type !== 'collection_view') {
    console.error(`[${traceId}] pageId "${SITE_DATABASE_PAGE_ID}" is not a database`)
    return EmptyData(SITE_DATABASE_PAGE_ID)
  }

  const stepStart4 = Date.now()
>>>>>>> upstream/main
  const collectionId = rawMetadata?.collection_id
  const rawCollection =
    pageRecordMap.collection?.[collectionId] ||
    pageRecordMap.collection?.[idToUuid(collectionId)] ||
    {}
<<<<<<< HEAD

=======
>>>>>>> upstream/main
  const collection = normalizeCollection(rawCollection)
  const collectionQuery = pageRecordMap.collection_query
  const collectionView = pageRecordMap.collection_view
  const schema = normalizeSchema(collection?.schema || {})
  const viewIds = rawMetadata?.view_ids
  const collectionData = []
<<<<<<< HEAD

  // ✅ 新增：先对原始 block 做格式统一，避免 normalizePageBlock 识别失败
  block = adapterNotionBlockMap({ block }).block


  const pageIds = getAllPageIds(
    collectionQuery,
    collectionId,
    collectionView,
    viewIds,
    block
  )

  if (pageIds?.length === 0) {
    console.error(
      '获取到的文章列表为空，请检查notion模板',
      collectionQuery,
      collection,
      collectionView,
      viewIds,
      pageRecordMap
    )
  } else {
    // console.log('有效Page数量', pageIds?.length)
  }

  // 1️⃣ 找出需要 fetch 的 block
  const blockIdsNeedFetch = []
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]
    const pageBlock = normalizePageBlock(block[id])

    if (!pageBlock) {
      blockIdsNeedFetch.push(id)
    }
  }

  // 2️⃣ fetch 缺失的 blocks
  const fetchedBlocks = await fetchInBatches(blockIdsNeedFetch)
  // ✅ fetch 回来的也要 adapter
  const adaptedFetchedBlocks = adapterNotionBlockMap({ block: fetchedBlocks }).block
  block = Object.assign({}, block, adaptedFetchedBlocks)

  // 3️⃣ 只执行一次：生成 collectionData
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i]

    const rawBlock = block[id]
    const pageBlock = normalizePageBlock(rawBlock)

    if (!pageBlock) {
      // console.warn('⚠️ 无法解析 page block:', id, rawBlock)
      continue
    }

    const properties =
      (await getPageProperties(
        id,
        pageBlock,
        schema,
        null,
        getTagOptions(schema)
      )) || null

    if (properties) {
      collectionData.push(properties)
    }
  }

  // 站点配置优先读取配置表格，否则读取blog.config.js 文件
  const NOTION_CONFIG = (await getConfigMapFromConfigPage(collectionData)) || {}

  // 处理每一条数据的字段
  collectionData.forEach(function (element) {
    adjustPageProperties(element, NOTION_CONFIG)
  })

  // 站点基础信息
  const siteInfo = getSiteInfo({ collection, block, NOTION_CONFIG })

  // 文章计数
  let postCount = 0

  // 查找所有的Post和Page
  const allPages = collectionData.filter(post => {
    if (post?.type === 'Post' && post.status === 'Published') {
      postCount++
    }

    return (
      post &&
      post?.slug &&
      //   !post?.slug?.startsWith('http') &&
      (post?.status === 'Invisible' || post?.status === 'Published')
    )
  })

  // Sort by date
  if (siteConfig('POSTS_SORT_BY', null, NOTION_CONFIG) === 'date') {
    allPages.sort((a, b) => {
      return b?.publishDate - a?.publishDate
    })
  }

  const notice = await getNotice(
    collectionData.filter(post => {
      return (
        post &&
        post?.type &&
        post?.type === 'Notice' &&
        post.status === 'Published'
      )
    })?.[0]
  )
  // 所有分类
  const categoryOptions = getAllCategories({
    allPages,
    categoryOptions: getCategoryOptions(schema)
  })
  // 所有标签
  const tagSchemaOptions = getTagOptions(schema)
  const tagOptions =
    getAllTags({
      allPages: allPages ?? [],
      tagOptions: tagSchemaOptions ?? [],
      NOTION_CONFIG
    }) ?? null
  // 旧的菜单
  const customNav = getCustomNav({
    allPages: collectionData.filter(
      post => post?.type === 'Page' && post.status === 'Published'
    )
  })
  // 新的菜单
  const customMenu = getCustomMenu({ collectionData, NOTION_CONFIG })
  const latestPosts = getLatestPosts({ allPages, from, latestPostCount: 6 })
  const allNavPages = getNavPages({ allPages })
=======
  const stepEnd4 = Date.now()
  console.log(`[${traceId}] ⏱ Collection 初始化耗时: ${stepEnd4 - stepStart4}ms @ ${new Date().toISOString()}`)

  // ── 获取 pageIds ──
  // const stepStart5 = Date.now()
  const pageIds = getAllPageIds(collectionQuery, collectionId, collectionView, viewIds, block)
  // const stepEnd5 = Date.now()
  // console.log(`[${traceId}] ⏱ getAllPageIds 耗时: ${stepEnd5 - stepStart5}ms, count: ${pageIds.length} @ ${new Date().toISOString()}`)

  // ── 找出需要补拉的 block ──
  // const stepStart6 = Date.now()
  const blockIdsNeedFetch = pageIds.filter(id => !normalizePageBlock(block[id]))
  // const limit = pLimit(10)
  // const idsNeedFetch = (
  //   await Promise.all(
  //     blockIdsNeedFetch.map(id =>
  //       limit(async () => {
  //         const cache = await getDataFromCache(`page_block_${id}`)
  //         return cache ? null : id
  //       })
  //     )
  //   )
  // ).filter(Boolean)
  // const stepEnd6 = Date.now()
  // console.log(`[${traceId}] ⏱ 缓存检查耗时: ${stepEnd6 - stepStart6}ms, 需补拉: ${idsNeedFetch.length} @ ${new Date().toISOString()}`)

  // ── 批量补拉 block ──
  const stepStart7 = Date.now()
  if (blockIdsNeedFetch.length > 0) {
    const fetchedBlocks = await fetchInBatches(blockIdsNeedFetch)
    const adaptedFetchedBlocks = adapterNotionBlockMap({ block: fetchedBlocks }).block
    block = { ...block, ...adaptedFetchedBlocks }
  }
  const stepEnd7 = Date.now()
  console.log(`[${traceId}] ⏱ fetchInBatches + adapter 耗时: ${stepEnd7 - stepStart7}ms @ ${new Date().toISOString()}`)

  // ── 生成 collectionData ──
  const stepStart8 = Date.now()
  for (const id of pageIds) {
    const pageBlock = normalizePageBlock(block[id])
    if (!pageBlock) continue
    const properties = (await getPageProperties(id, pageBlock, schema, null, getTagOptions(schema))) || null
    if (properties) collectionData.push(properties)
  }
  const stepEnd8 = Date.now()
  console.log(`[${traceId}] ⏱ collectionData 构建耗时: ${stepEnd8 - stepStart8}ms @ ${new Date().toISOString()}`)

  // ── 站点配置 ──
  const stepStart9 = Date.now()
  const NOTION_CONFIG = (await getConfigMapFromConfigPage(collectionData)) || {}
  collectionData.forEach(element => adjustPageProperties(element, NOTION_CONFIG))
  const siteInfo = getSiteInfo({ collection, block, NOTION_CONFIG })
  const stepEnd9 = Date.now()
  console.log(`[${traceId}] ⏱ 配置站点信息耗时: ${stepEnd9 - stepStart9}ms @ ${new Date().toISOString()}`)

  // ── 筛选有效页面、排序 ──
  // const stepStart10 = Date.now()
  let postCount = 0
  const allPages = collectionData.filter(post => {
    if (post?.type === 'Post' && post.status === 'Published') postCount++
    return post?.slug && (post?.status === 'Invisible' || post?.status === 'Published')
  })
  const sortBy = siteConfig('POSTS_SORT_BY', null, NOTION_CONFIG)
  if (sortBy === 'date') {
    allPages.sort((a, b) => (b?.publishDate ?? 0) - (a?.publishDate ?? 0))
  }
  // const stepEnd10 = Date.now()
  // console.log(`[${traceId}] ⏱ 筛选 + 排序 allPages 耗时: ${stepEnd10 - stepStart10}ms @ ${new Date().toISOString()}`)

  // ── 其他数据生成 ──
  const stepStart11 = Date.now()
  const notice = await getNotice(collectionData.find(post => post?.type === 'Notice' && post.status === 'Published'))
  const categoryOptions = getAllCategories({ allPages, categoryOptions: getCategoryOptions(schema) })
  const tagSchemaOptions = getTagOptions(schema)
  const tagOptions = getAllTags({ allPages, tagOptions: tagSchemaOptions ?? [], NOTION_CONFIG }) ?? null
  const customNav = getCustomNav({ allPages: collectionData.filter(post => post?.type === 'Page' && post.status === 'Published') })
  const customMenu = getCustomMenu({ collectionData, NOTION_CONFIG })
  const latestPosts = getLatestPosts({ allPages, from, latestPostCount: 6 })
  const allNavPages = getNavPages({ allPages })
  const stepEnd11 = Date.now()
  console.log(`[${traceId}] ⏱ 其他数据生成耗时: ${stepEnd11 - stepStart11}ms @ ${new Date().toISOString()}`)
  const overallEnd = Date.now()
  console.log(`[${traceId}] ✅ convertNotionToSiteData 完成，总耗时: ${overallEnd - overallStart}ms @ ${new Date().toISOString()}`)
>>>>>>> upstream/main

  return {
    NOTION_CONFIG,
    notice,
    siteInfo,
    allPages,
    allNavPages,
    collection,
    collectionQuery,
    collectionId,
    collectionView,
    viewIds,
    block,
    schema,
    tagOptions,
    categoryOptions,
    rawMetadata,
    customNav,
    customMenu,
    postCount,
    pageIds,
    latestPosts
  }
}

/**
<<<<<<< HEAD
 * 返回给浏览器前端的数据处理
 * 适当脱敏
 * 减少体积
 * 其它处理
 * @param {*} db
 */
function handleDataBeforeReturn(db) {
  // 清理多余数据
=======
 * 返回给浏览器前端前的数据清理
 * 脱敏、减体积、定时发布处理
 */
function handleDataBeforeReturn(db) {
>>>>>>> upstream/main
  delete db.block
  delete db.schema
  delete db.rawMetadata
  delete db.pageIds
  delete db.viewIds
  delete db.collection
  delete db.collectionQuery
  delete db.collectionId
  delete db.collectionView

<<<<<<< HEAD
  // 清理多余的块
=======
>>>>>>> upstream/main
  if (db?.notice) {
    db.notice = cleanBlock(db?.notice)
    delete db.notice?.id
  }
<<<<<<< HEAD
  db.categoryOptions = cleanIds(db?.categoryOptions)
  db.customMenu = cleanIds(db?.customMenu)

  //   db.latestPosts = shortenIds(db?.latestPosts)
  db.allNavPages = shortenIds(db?.allNavPages)
  //   db.allPages = cleanBlocks(db?.allPages)
=======

  db.categoryOptions = cleanIds(db?.categoryOptions)
  db.customMenu = cleanIds(db?.customMenu)
  db.allNavPages = shortenIds(db?.allNavPages)
>>>>>>> upstream/main

  db.allNavPages = cleanPages(db?.allNavPages, db.tagOptions)
  db.allPages = cleanPages(db.allPages, db.tagOptions)
  db.latestPosts = cleanPages(db.latestPosts, db.tagOptions)
<<<<<<< HEAD
  // 必须在使用完毕后才能进行清理
  db.tagOptions = cleanTagOptions(db?.tagOptions)

=======
  db.tagOptions = cleanTagOptions(db?.tagOptions)

  // 定时发布：检查发布时间窗口，超出范围的隐藏
>>>>>>> upstream/main
  const POST_SCHEDULE_PUBLISH = siteConfig(
    'POST_SCHEDULE_PUBLISH',
    null,
    db.NOTION_CONFIG
  )
  if (POST_SCHEDULE_PUBLISH) {
<<<<<<< HEAD
    //   console.log('[定时发布] 开启检测')
    db.allPages?.forEach(p => {
      // 新特性，判断文章的发布和下架时间，如果不在有效期内则进行下架处理
      const publish = isInRange(p.title, p.date)
      if (!publish) {
        const currentTimestamp = Date.now()
        const startTimestamp = getTimestamp(
          p.date.start_date,
          p.date.start_time || '00:00',
          p.date.time_zone
        )
        const endTimestamp = getTimestamp(
          p.date.end_date,
          p.date.end_time || '23:59',
          p.date.time_zone
        )
        console.log(
          '[定时发布] 隐藏--> 文章:',
          p.title,
          '当前时间戳:',
          currentTimestamp,
          '目标时间戳:',
          startTimestamp,
          '-',
          endTimestamp
        )
        console.log(
          '[定时发布] 隐藏--> 文章:',
          p.title,
          '当前时间:',
          new Date(),
          '目标时间:',
          p.date
        )
        // 隐藏
=======
    db.allPages?.forEach(p => {
      if (!isInRange(p.title, p.date)) {
        console.log('[定时发布] 隐藏-->', p.title, p.date)
>>>>>>> upstream/main
        p.status = 'Invisible'
      }
    })
  }

  return db
}

<<<<<<< HEAD
/**
 * 处理文章列表中的异常数据
 * @param {Array} allPages - 所有页面数据
 * @param {Array} tagOptions - 标签选项
 * @returns {Array} 处理后的 allPages
 */
function cleanPages(allPages, tagOptions) {
  // 校验参数是否为数组
  if (!Array.isArray(allPages) || !Array.isArray(tagOptions)) {
    console.warn('Invalid input: allPages and tagOptions should be arrays.')
    return allPages || [] // 返回空数组或原始值
  }

  // 提取 tagOptions 中所有合法的标签名
  const validTags = new Set(
    tagOptions
      .map(tag => (typeof tag.name === 'string' ? tag.name : null))
      .filter(Boolean) // 只保留合法的字符串
  )

  // 遍历所有的 pages
  allPages.forEach(page => {
    // 确保 tagItems 是数组
    if (Array.isArray(page.tagItems)) {
      // 对每个 page 的 tagItems 进行过滤
      page.tagItems = page.tagItems.filter(
        tagItem =>
          validTags.has(tagItem?.name) && typeof tagItem.name === 'string' // 校验 tagItem.name 是否是字符串
      )
    }
  })

  return allPages
}

/**
 * 清理一组数据的id
 * @param {*} items
 * @returns
 */
=======
// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function cleanPages(allPages, tagOptions) {
  if (!Array.isArray(allPages) || !Array.isArray(tagOptions)) {
    console.warn('Invalid input: allPages and tagOptions should be arrays.')
    return allPages || []
  }
  const validTags = new Set(
    tagOptions
      .map(tag => (typeof tag.name === 'string' ? tag.name : null))
      .filter(Boolean)
  )
  allPages.forEach(page => {
    if (Array.isArray(page.tagItems)) {
      page.tagItems = page.tagItems.filter(
        tagItem => validTags.has(tagItem?.name) && typeof tagItem.name === 'string'
      )
    }
  })
  return allPages
}

>>>>>>> upstream/main
function shortenIds(items) {
  if (items && Array.isArray(items)) {
    return deepClone(
      items.map(item => {
        item.short_id = getShortId(item.id)
        delete item.id
        return item
      })
    )
  }
  return items
}

<<<<<<< HEAD
/**
 * 清理一组数据的id
 * @param {*} items
 * @returns
 */
=======
>>>>>>> upstream/main
function cleanIds(items) {
  if (items && Array.isArray(items)) {
    return deepClone(
      items.map(item => {
        delete item.id
        return item
      })
    )
  }
  return items
}

<<<<<<< HEAD
/**
 * 清理和过滤tagOptions
 * @param {*} tagOptions
 * @returns
 */
=======
>>>>>>> upstream/main
function cleanTagOptions(tagOptions) {
  if (tagOptions && Array.isArray(tagOptions)) {
    return deepClone(
      tagOptions
        .filter(tagOption => tagOption.source === 'Published')
<<<<<<< HEAD
        .map(({ id, source, ...newTagOption }) => newTagOption)
=======
        .map(({ id, source, ...rest }) => rest)
>>>>>>> upstream/main
    )
  }
  return tagOptions
}

<<<<<<< HEAD
/**
 * 清理block数据
 */
function cleanBlock(item) {
  const post = deepClone(item)
  const pageBlock = post?.blockMap?.block
  //   delete post?.id
  //   delete post?.blockMap?.collection

=======
function cleanBlock(item) {
  const post = deepClone(item)
  const pageBlock = post?.blockMap?.block
>>>>>>> upstream/main
  if (pageBlock) {
    for (const i in pageBlock) {
      pageBlock[i] = cleanBlock(pageBlock[i])
      delete pageBlock[i]?.role
      delete pageBlock[i]?.value?.version
      delete pageBlock[i]?.value?.created_by_table
      delete pageBlock[i]?.value?.created_by_id
      delete pageBlock[i]?.value?.last_edited_by_table
      delete pageBlock[i]?.value?.last_edited_by_id
      delete pageBlock[i]?.value?.space_id
<<<<<<< HEAD
      delete pageBlock[i]?.value?.version
=======
>>>>>>> upstream/main
      delete pageBlock[i]?.value?.format?.copied_from_pointer
      delete pageBlock[i]?.value?.format?.block_locked_by
      delete pageBlock[i]?.value?.parent_table
      delete pageBlock[i]?.value?.copied_from_pointer
      delete pageBlock[i]?.value?.copied_from
<<<<<<< HEAD
      delete pageBlock[i]?.value?.created_by_table
      delete pageBlock[i]?.value?.created_by_id
      delete pageBlock[i]?.value?.last_edited_by_table
      delete pageBlock[i]?.value?.last_edited_by_id
=======
>>>>>>> upstream/main
      delete pageBlock[i]?.value?.permissions
      delete pageBlock[i]?.value?.alive
    }
  }
  return post
}

/**
<<<<<<< HEAD
 * 获取最新文章 根据最后修改时间倒序排列
 * @param {*}} param0
 * @returns
=======
 * 获取最新文章，按最后修改时间倒序
 * 修复：原代码用 Object.create(allPosts) 不是真正的数组副本，改为展开运算符
>>>>>>> upstream/main
 */
function getLatestPosts({ allPages, from, latestPostCount }) {
  const allPosts = allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
<<<<<<< HEAD

  const latestPosts = Object.create(allPosts).sort((a, b) => {
    const dateA = new Date(a?.lastEditedDate || a?.publishDate)
    const dateB = new Date(b?.lastEditedDate || b?.publishDate)
    return dateB - dateA
  })
  return latestPosts.slice(0, latestPostCount)
}

/**
 * 获取用户自定义单页菜单
 * 旧版本，不读取Menu菜单，而是读取type=Page生成菜单
 * @param notionPageData
 * @returns {Promise<[]|*[]>}
 */
=======
  return [...(allPosts ?? [])]
    .sort((a, b) => {
      const dateA = new Date(a?.lastEditedDate || a?.publishDate)
      const dateB = new Date(b?.lastEditedDate || b?.publishDate)
      return dateB - dateA
    })
    .slice(0, latestPostCount)
}

>>>>>>> upstream/main
function getCustomNav({ allPages }) {
  const customNav = []
  if (allPages && allPages.length > 0) {
    allPages.forEach(p => {
      p.to = p.slug
      customNav.push({
        icon: p.icon || null,
        name: p.title || p.name || '',
        href: p.href,
        target: p.target,
        show: true
      })
    })
  }
  return customNav
}

<<<<<<< HEAD
/**
 * 获取自定义菜单
 * @param {*} allPages
 * @returns
 */
=======
>>>>>>> upstream/main
function getCustomMenu({ collectionData, NOTION_CONFIG }) {
  const menuPages = collectionData.filter(
    post =>
      post.status === 'Published' &&
      (post?.type === 'Menu' || post?.type === 'SubMenu')
  )
  const menus = []
  if (menuPages && menuPages.length > 0) {
    menuPages.forEach(e => {
      e.show = true
      if (e.type === 'Menu') {
        menus.push(e)
      } else if (e.type === 'SubMenu') {
        const parentMenu = menus[menus.length - 1]
        if (parentMenu) {
          if (parentMenu.subMenus) {
            parentMenu.subMenus.push(e)
          } else {
            parentMenu.subMenus = [e]
          }
        }
      }
    })
  }
  return menus
}

<<<<<<< HEAD
/**
 * 获取标签选项
 * @param schema
 * @returns {undefined}
 */
=======
>>>>>>> upstream/main
function getTagOptions(schema) {
  if (!schema) return {}
  const tagSchema = Object.values(schema).find(
    e => e.name === BLOG.NOTION_PROPERTY_NAME.tags
  )
  return tagSchema?.options || []
}

<<<<<<< HEAD
/**
 * 获取分类选项
 * @param schema
 * @returns {{}|*|*[]}
 */
=======
>>>>>>> upstream/main
function getCategoryOptions(schema) {
  if (!schema) return {}
  const categorySchema = Object.values(schema).find(
    e => e.name === BLOG.NOTION_PROPERTY_NAME.category
  )
  return categorySchema?.options || []
}

<<<<<<< HEAD
/**
 * 站点信息
 * @param notionPageData
 * @param from
 * @returns {Promise<{title,description,pageCover,icon}>}
 */
=======
>>>>>>> upstream/main
function getSiteInfo({ collection, block, NOTION_CONFIG }) {
  const defaultTitle = NOTION_CONFIG?.TITLE || 'NotionNext BLOG'
  const defaultDescription =
    NOTION_CONFIG?.DESCRIPTION || '这是一个由NotionNext生成的站点'
  const defaultPageCover = NOTION_CONFIG?.HOME_BANNER_IMAGE || '/bg_image.jpg'
  const defaultIcon = NOTION_CONFIG?.AVATAR || '/avatar.svg'
  const defaultLink = NOTION_CONFIG?.LINK || BLOG.LINK
<<<<<<< HEAD
  // 空数据的情况返回默认值
=======

>>>>>>> upstream/main
  if (!collection && !block) {
    return {
      title: defaultTitle,
      description: defaultDescription,
      pageCover: defaultPageCover,
      icon: defaultIcon,
      link: defaultLink
    }
  }

  const title = collection?.name?.[0][0] || defaultTitle
  const description = collection?.description
    ? Object.assign(collection).description[0][0]
    : defaultDescription
<<<<<<< HEAD

=======
>>>>>>> upstream/main
  const pageCover = collection?.cover
    ? mapImgUrl(collection?.cover, collection, 'collection')
    : defaultPageCover

<<<<<<< HEAD
  // 用户头像压缩一下
=======
>>>>>>> upstream/main
  let icon = compressImage(
    collection?.icon
      ? mapImgUrl(collection?.icon, collection, 'collection')
      : defaultIcon
  )
<<<<<<< HEAD
  // 站点网址
  const link = NOTION_CONFIG?.LINK || defaultLink

  // 站点图标不能是emoji
  const emojiPattern = /\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g
  if (!icon || emojiPattern.test(icon)) {
    icon = defaultIcon
  }
  return { title, description, pageCover, icon, link }
}

/**
 * 判断文章是否在发布时间内
 * @param {string} title - 文章标题
 * @param {Object} date - 时间范围参数
 * @param {string} date.start_date - 开始日期（格式：YYYY-MM-DD）
 * @param {string} date.start_time - 开始时间（可选，格式：HH:mm）
 * @param {string} date.end_date - 结束日期（格式：YYYY-MM-DD）
 * @param {string} date.end_time - 结束时间（可选，格式：HH:mm）
 * @param {string} date.time_zone - 时区（IANA格式，如 "Asia/Shanghai"）
 * @returns {boolean} 是否在范围内
 */
=======
  const link = NOTION_CONFIG?.LINK || defaultLink
  const emojiPattern = /\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g
  if (!icon || emojiPattern.test(icon)) icon = defaultIcon

  return { title, description, pageCover, icon, link }
}

>>>>>>> upstream/main
function isInRange(title, date = {}) {
  const {
    start_date,
    start_time = '00:00',
    end_date,
    end_time = '23:59',
    time_zone = 'Asia/Shanghai'
  } = date

<<<<<<< HEAD
  // 获取当前时间的时间戳（基于目标时区）
  const currentTimestamp = Date.now()

  // 获取开始和结束时间的时间戳
  const startTimestamp = getTimestamp(start_date, start_time, time_zone)
  const endTimestamp = getTimestamp(end_date, end_time, time_zone)

  // 判断是否在范围内
  if (startTimestamp && currentTimestamp < startTimestamp) {
    return false
  }

  if (endTimestamp && currentTimestamp > endTimestamp) {
    return false
  }

  return true
}

/**
 * 将指定时区的日期字符串转换为 UTC 时间
 * @param {string} dateStr - 日期字符串，格式为 YYYY-MM-DD HH:mm:ss
 * @param {string} timeZone - 时区名称（如 "Asia/Shanghai"）
 * @returns {Date} - 转换后的 Date 对象（UTC 时间）
 */
function convertToUTC(dateStr, timeZone = 'Asia/Shanghai') {
  // 维护一个时区偏移映射（以小时为单位）
  const timeZoneOffsets = {
    // UTC 基础
    UTC: 0,
    'Etc/GMT': 0,
    'Etc/GMT+0': 0,

    // 亚洲地区
    'Asia/Shanghai': 8, // 中国
    'Asia/Taipei': 8, // 台湾
    'Asia/Tokyo': 9, // 日本
    'Asia/Seoul': 9, // 韩国
    'Asia/Kolkata': 5.5, // 印度
    'Asia/Jakarta': 7, // 印尼
    'Asia/Singapore': 8, // 新加坡
    'Asia/Hong_Kong': 8, // 香港
    'Asia/Bangkok': 7, // 泰国
    'Asia/Dubai': 4, // 阿联酋
    'Asia/Tehran': 3.5, // 伊朗
    'Asia/Riyadh': 3, // 沙特阿拉伯

    // 欧洲地区
    'Europe/London': 0, // 英国（GMT）
    'Europe/Paris': 1, // 法国（CET）
    'Europe/Berlin': 1, // 德国
    'Europe/Moscow': 3, // 俄罗斯
    'Europe/Amsterdam': 1, // 荷兰

    // 美洲地区
    'America/New_York': -5, // 美国东部（EST）
    'America/Chicago': -6, // 美国中部（CST）
    'America/Denver': -7, // 美国山区时间（MST）
    'America/Los_Angeles': -8, // 美国西部（PST）
    'America/Sao_Paulo': -3, // 巴西
    'America/Argentina/Buenos_Aires': -3, // 阿根廷

    // 非洲地区
    'Africa/Johannesburg': 2, // 南非
    'Africa/Cairo': 2, // 埃及
    'Africa/Nairobi': 3, // 肯尼亚

    // 大洋洲地区
    'Australia/Sydney': 10, // 澳大利亚东部
    'Australia/Perth': 8, // 澳大利亚西部
    'Pacific/Auckland': 13, // 新西兰
    'Pacific/Fiji': 12, // 斐济

    // 北极与南极
    'Antarctica/Palmer': -3, // 南极洲帕尔默
    'Antarctica/McMurdo': 13 // 南极洲麦克默多
  }

  // 预设每个大洲的默认时区
  const continentDefaults = {
    Asia: 'Asia/Shanghai',
    Europe: 'Europe/London',
    America: 'America/New_York',
    Africa: 'Africa/Cairo',
    Australia: 'Australia/Sydney',
    Pacific: 'Pacific/Auckland',
    Antarctica: 'Antarctica/Palmer',
    UTC: 'UTC'
  }

  // 获取目标时区的偏移量（以小时为单位）
  let offsetHours = timeZoneOffsets[timeZone]

  // 未被支持的时区采用兼容
  if (offsetHours === undefined) {
    // 获取时区所属大洲（"Continent/City" -> "Continent"）
    const continent = timeZone.split('/')[0]

    // 选择该大洲的默认时区
    const fallbackZone = continentDefaults[continent] || 'UTC'
    offsetHours = timeZoneOffsets[fallbackZone]

    console.warn(
      `Warning: Unsupported time zone "${timeZone}". Using default "${fallbackZone}" for continent "${continent}".`
    )
  }

  // 将日期字符串转换为本地时间的 Date 对象
=======
  const currentTimestamp = Date.now()
  const startTimestamp = getTimestamp(start_date, start_time, time_zone)
  const endTimestamp = getTimestamp(end_date, end_time, time_zone)

  if (startTimestamp && currentTimestamp < startTimestamp) return false
  if (endTimestamp && currentTimestamp > endTimestamp) return false
  return true
}

function convertToUTC(dateStr, timeZone = 'Asia/Shanghai') {
  const timeZoneOffsets = {
    UTC: 0, 'Etc/GMT': 0, 'Etc/GMT+0': 0,
    'Asia/Shanghai': 8, 'Asia/Taipei': 8, 'Asia/Tokyo': 9, 'Asia/Seoul': 9,
    'Asia/Kolkata': 5.5, 'Asia/Jakarta': 7, 'Asia/Singapore': 8,
    'Asia/Hong_Kong': 8, 'Asia/Bangkok': 7, 'Asia/Dubai': 4,
    'Asia/Tehran': 3.5, 'Asia/Riyadh': 3,
    'Europe/London': 0, 'Europe/Paris': 1, 'Europe/Berlin': 1,
    'Europe/Moscow': 3, 'Europe/Amsterdam': 1,
    'America/New_York': -5, 'America/Chicago': -6, 'America/Denver': -7,
    'America/Los_Angeles': -8, 'America/Sao_Paulo': -3,
    'America/Argentina/Buenos_Aires': -3,
    'Africa/Johannesburg': 2, 'Africa/Cairo': 2, 'Africa/Nairobi': 3,
    'Australia/Sydney': 10, 'Australia/Perth': 8,
    'Pacific/Auckland': 13, 'Pacific/Fiji': 12,
    'Antarctica/Palmer': -3, 'Antarctica/McMurdo': 13
  }
  const continentDefaults = {
    Asia: 'Asia/Shanghai', Europe: 'Europe/London', America: 'America/New_York',
    Africa: 'Africa/Cairo', Australia: 'Australia/Sydney',
    Pacific: 'Pacific/Auckland', Antarctica: 'Antarctica/Palmer', UTC: 'UTC'
  }

  let offsetHours = timeZoneOffsets[timeZone]
  if (offsetHours === undefined) {
    const continent = timeZone.split('/')[0]
    const fallbackZone = continentDefaults[continent] || 'UTC'
    offsetHours = timeZoneOffsets[fallbackZone]
    console.warn(
      `Warning: Unsupported time zone "${timeZone}". Using default "${fallbackZone}".`
    )
  }

>>>>>>> upstream/main
  const localDate = new Date(`${dateStr.replace(' ', 'T')}Z`)
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`)
  }
<<<<<<< HEAD

  // 计算 UTC 时间的时间戳
  const utcTimestamp = localDate.getTime() - offsetHours * 60 * 60 * 1000
  return new Date(utcTimestamp)
}

// 辅助函数：生成指定日期时间的时间戳（基于目标时区）
=======
  return new Date(localDate.getTime() - offsetHours * 3600 * 1000)
}

>>>>>>> upstream/main
function getTimestamp(date, time = '00:00', time_zone) {
  if (!date) return null
  return convertToUTC(`${date} ${time}:00`, time_zone).getTime()
}

<<<<<<< HEAD
/**
 * 获取导航用的精减文章列表
 * gitbook主题用到，只保留文章的标题分类标签分类信息，精减掉摘要密码日期等数据
 * 导航页面的条件，必须是Posts
 * @param {*} param0
 */
export function getNavPages({ allPages }) {
  const allNavPages = allPages?.filter(post => {
    return (
=======
export function getNavPages({ allPages }) {
  const allNavPages = allPages?.filter(
    post =>
>>>>>>> upstream/main
      post &&
      post?.slug &&
      post?.type === 'Post' &&
      post?.status === 'Published'
<<<<<<< HEAD
    )
  })

=======
  )
>>>>>>> upstream/main
  return allNavPages.map(item => ({
    id: item.id,
    title: item.title || '',
    pageCoverThumbnail: item.pageCoverThumbnail || '',
    category: item.category || null,
    tags: item.tags || null,
    summary: item.summary || null,
    slug: item.slug,
    href: item.href,
    pageIcon: item.pageIcon || '',
    lastEditedDate: item.lastEditedDate,
    publishDate: item.publishDate,
    ext: item.ext || {}
  }))
}