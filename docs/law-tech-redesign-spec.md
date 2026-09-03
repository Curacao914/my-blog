# law-tech.dev 渐进重构规格

详细实施计划见：`docs/superpowers/plans/2026-06-23-law-tech-platform-redesign.md`。

## 目标

law-tech.dev 不再只是 NotionNext 博客首页，而是一个公开个人主页 + 私人工作台的渐进式个人系统。第一阶段只落地公开首页与项目边界，保留现有 NotionNext 文章、分类、标签、归档等路由，避免破坏已有内容。

## 信息架构

公开层：

- 首页：介绍 Curacao、长期栏目、最近更新。
- 内容：文章、课程笔记、读书记录、公开分享。
- 项目：课程整理流水线、法学/技术实践、研究或语料项目、网站改造记录。
- 工具：OCR、引注和未来工具的统一入口，不在首页逐个堆按钮。
- 关于：个人介绍、联系方式、站点说明。
- 工作台：私人入口。

私人工作台：

- 今日
- 事项
- 课程
- 资料
- 写作
- 分享
- 设置

第一版工作台先使用 `/desk`，保留旧 `/dashboard` 不覆盖。这样避免影响 NotionNext/Clerk 既有账户、会员或后台路由。等 `/desk` 稳定后，再决定是否迁移或替换 `/dashboard`。

## 视觉方向

采用 v3A 方向：

- 冷白微绿背景。
- 深叶绿为主色。
- 蜂蜜黄作为少量点缀。
- 柔蓝用于工作台、链接或低调强调。
- 像素感只作为轻微人格标记，不做完整像素主题站。
- 正确头像使用 `public/curacao-avatar.png`。
- 不使用头像悬浮球。
- 不使用动态签名作为首屏主视觉；如后续加入，只作为低调彩蛋。

## 命名规范

避免：

- 智能 Todo
- AI 工作台
- 知识中枢
- 效率驾驶舱
- 其他 SaaS 化、AI 味过重的命名

采用：

- 内容
- 项目
- 工具
- 工作台
- 事项
- 课程整理
- 资料
- 写作
- 分享

## 首页第一阶段范围

首页替换为独立自定义页面，不再渲染 NotionNext 主题首页。

保留：

- 旧文章页
- 分类页
- 标签页
- 归档页
- 搜索页
- RSS / sitemap 生成逻辑

首页包含：

- 顶部导航：内容 / 项目 / 工具 / 关于 / 工作台。
- 身份区：头像、Curacao、“前非法本法学生，现法硕非法学生”。
- 主题文案：“你也在思考意义有什么意义吗？”。
- 长期栏目：内容 / 项目 / 工具 / 工作台。
- 最近更新：文章、课程笔记、项目。

首页不包含：

- OCR、引注、课程笔记按钮堆叠。
- 头像悬浮球。
- 大面积动态签名。
- AI、课程流水线、事项系统。
- 登录与数据库入口不放在首页；它们属于工作台底座。

## 工作台壳

工作台壳采用略高于公开页的“液态玻璃”方向：半透明层级、侧边栏、状态轨、快捷收集入口和模块卡片。它是私人界面，可以比公开主页更灵活、更好玩，但必须保持清晰。

当前第一版只做壳，不接外部 AI、提醒服务或云端任务队列。下一工程阶段直接接入登录与数据库底座，避免先做文件型临时后台再整体迁移。所有模块必须保留后续兼容点：

- 今日：承接当天事项、待整理队列、最近材料、快照状态。
- 事项：承接自然语言快速收集、时间地点提取、提醒和待整理；第一版的 `⌘K` 快速收集面板只做本地交互占位，不持久化。
- 课程：承接 SRT + PPT/PPTX + OCR 到课程笔记的流水线。
- 资料：承接文件位置、链接、快照、阅读记录和资料索引。
- 写作：承接草稿、引注、参考文献和发布前检查。
- 分享：承接公开、密码访问、有效期、独立分享链接和公开快照。
- 设置：承接分类、tag、密码策略、同步器和课程偏好。

工作台中的“内容配置台”第一版只做只读预览，用来固定后续后台需要支持的操作模型：

- 每篇内容可以单独设置类别、tag、访问方式和密码有效期。
- 课程类内容保留课程名、课次、教师、日期和可嵌套文件夹路径。
- 私有、密码、公开三种状态必须反映到快照、搜索、RSS、sitemap 和详情页访问控制。
- 当前只读列表读取 `data/content-snapshots/live/index.json`，不读取正文，不写回 staging；下一阶段改为读取数据库。
- 可视化操作先写入数据库草稿/元数据表；只有校验通过才发布为公开可读版本，并可选导出 live snapshot。
- 第一版未接入写入、密码哈希、真实 Notion/Markdown 同步和批量编辑，但这些必须作为后续补点保留。

旧 `/dashboard` 暂不删除；新导航的“工作台”指向 `/desk`。

## 内容中转层原则

后续内容中转层遵循：

```text
Notion / Markdown
→ 数据库草稿
→ 字段校验
→ Markdown 渲染校验
→ asset 校验
→ 发布为公开可读版本
→ 可选导出 live snapshot
```

硬规则：

- 同步失败不覆盖最后一次成功快照。
- 前端读取已发布版本；静态兼容层可以读取导出的 live snapshot。
- Notion 接口异常、格式变化、字段缺失、正文为空、资源异常时，保留旧版本并记录错误。
- 下一阶段使用数据库作为主存储：内容、版本、访问控制、展示配置分表管理。
- 文件型快照保留为迁移、导入、离线备份和静态部署兼容层。
- `live` 导出只保存公开且已发布的快照；私有、草稿、归档内容不会进入公开 live。
- 同步器、Markdown 导入器、手工导入器都只能先写数据库草稿，不能直接发布。
- 校验失败报告写入数据库错误记录；兼容层可继续输出 `data/content-snapshots/errors/last-error.json`，用于后续修复适配器。

最小快照模型：

```ts
type ContentSnapshot = {
  id: string
  slug: string
  title: string
  type: 'article' | 'course-note' | 'reading-note' | 'project' | 'page'
  /**
   * 迁移期兼容字段；实际访问控制以 access.mode 为准。
   */
  visibility: 'private' | 'public' | 'shared'
  status: 'draft' | 'published' | 'archived'
  summary?: string
  /**
   * 迁移期兼容字段；后台一览式配置优先编辑 display。
   */
  tags: string[]
  category?: string
  access: {
    mode: 'public' | 'password' | 'private'
    password?: string
    expiresAt?: string
    allowIndexing: boolean
    allowRss: boolean
    allowSitemap: boolean
  }
  display: {
    category: '法律之上' | '法与算法' | '遇事不决' | '秘密花园'
    tags: string[]
    pinned?: boolean
    showInRecent?: boolean
  }
  course?: {
    name?: string
    lesson?: string
    teacher?: string
    date?: string
  }
  folder?: {
    path: string[]
  }
  date?: string
  updatedAt: string
  source: 'notion' | 'markdown' | 'manual'
  sourceId?: string
  bodyMarkdown: string
  assets: Array<{ url: string; alt?: string }>
  checksum: string
}
```

当前可用命令：

```bash
npm run content:snapshot:validate
npm run content:snapshot:promote
```

`validate` 只校验 staging，不改 live；`promote` 只有在全部 staging 快照通过校验时才重建 live。

真正私有内容使用 `access.mode: 'private'`，不会进入公开 live。密码分享内容使用 `access.mode: 'password'`，会生成页面入口，但页面层必须校验密码与有效期；过期后显示“分享已过期”。

## 后续确认点

- Clerk 管理员登录的允许列表使用邮箱还是 Clerk user id。
- Supabase 项目、数据库 URL、Storage bucket 是否由你手动创建后提供环境变量。
- 是否保留现有分类名“法律之上 / 法与算法 / 遇事不决 / 秘密花园”。
- OCR、引注保持外部部署还是迁入本项目。
- 课程整理第一阶段采用本地 Worker + 数据库 job 状态，还是直接上云端队列。
- 事项提醒优先使用邮件、PWA 通知、企业微信还是短信。

## 第一版未做但必须补回的事项

- 内容配置台从只读预览升级为真实数据库编辑器。
- 密码从明文示例升级为哈希存储，并加入有效期、尝试限制和审计记录。
- Notion/Markdown 同步器接入格式适配和错误隔离。
- 工作台登录与长期会话，优先 Clerk。
- 课程整理材料上传、Worker、文件存储和任务恢复。
- 事项 AI 二次整理、提醒渠道和 iPhone 快捷指令成品模板。
- OCR、引注现有页面是否迁入本项目的技术迁移。
