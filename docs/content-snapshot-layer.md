# 内容快照层

内容快照层是 Notion、Markdown 和未来数据库之间的缓冲区。它的目的不是替代 Notion，而是让前端只依赖最后一次成功生成的稳定内容。

## 目录

```text
data/content-snapshots/
├── staging/   # 同步器或手工导入器写入
├── live/      # 前端读取；只由 promote 脚本生成
└── errors/    # 最近一次校验失败报告
```

## 发布规则

```text
staging
→ 字段校验
→ 重复 id / slug 校验
→ 正文非空校验
→ asset 字段校验
→ 生成 checksum
→ 原子写入 live
```

任意 staging 文件失败时，发布整体失败，并且不会改动 `live`。这条规则用于处理 Notion 接口异常、格式变更、同步器 bug 或手工编辑错误。

## 命令

只检查，不写入 live：

```bash
npm run content:snapshot:validate
```

校验通过后发布：

```bash
npm run content:snapshot:promote
```

从本地 Markdown 生成 staging：

```bash
npm run content:markdown:import -- --input content/markdown
```

只检查转换结果、不写入 staging：

```bash
npm run content:markdown:import -- --input content/markdown --dry-run
```

推荐流程：

```text
content/markdown/*.md
→ content:markdown:import 写入 staging
→ content:snapshot:validate 检查全部 staging
→ content:snapshot:promote 只在全部通过时更新 live
→ content:db:import-live 可选导入数据库
```

## 快照字段

```ts
type ContentSnapshot = {
  id: string
  slug: string
  title: string
  type: 'article' | 'course-note' | 'reading-note' | 'project' | 'page'
  /**
   * 迁移期兼容字段；后台 UI 不直接暴露。
   */
  visibility: 'private' | 'public' | 'shared'
  status: 'draft' | 'published' | 'archived'
  summary?: string
  /**
   * 迁移期兼容字段；新内容优先使用 display.tags / display.category。
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
  source: 'notion' | 'markdown' | 'manual' | 'course-worker'
  sourceId?: string
  bodyMarkdown: string
  assets: Array<{ url: string; alt?: string }>
  checksum: string
}
```

第一版允许 staging 中的 `checksum` 先填占位值；发布时会重新计算并写入 live。后续如果同步器稳定，可以改成 staging 阶段即强校验 checksum。

## 公开过滤

只有同时满足以下条件的快照会进入 live：

- `access.mode !== 'private'`
- `status: 'published'`

这意味着真正私有的内容、草稿、归档内容不会出现在公开内容页、索引、RSS 或 sitemap 的后续实现中。

密码访问内容会进入 live，但页面层必须检查密码和有效期；过期后显示“分享已过期”。

## 一览式配置

后续工作台的内容一览表主要编辑 `access` 和 `display`：

| 字段 | 操作方式 | 说明 |
| --- | --- | --- |
| `display.category` | 单选 | 法律之上 / 法与算法 / 遇事不决 / 秘密花园 |
| `display.tags` | 多选 + 自由输入 | tag 池自动沉淀 |
| `status` | 单选 | 草稿 / 已发布 / 归档 |
| `access.mode` | 单选 | 公开 / 密码访问 / 私有 |
| `access.password` | 文本 | 仅密码访问时需要 |
| `access.expiresAt` | 日期时间 | 可留空，留空表示不过期 |
| `access.allowIndexing` | 开关 | 是否进入搜索索引 |
| `access.allowRss` | 开关 | 是否进入 RSS |
| `access.allowSitemap` | 开关 | 是否进入 sitemap |
| `display.showInRecent` | 开关 | 是否允许进入首页最近更新 |

“秘密花园”只是杂谈分类，不代表权限状态。权限一律由 `access.mode` 决定。

## 课程与文件夹

课程笔记可以使用轻量元信息，不强制每篇都填写：

```ts
course?: {
  name?: string
  lesson?: string
  teacher?: string
  date?: string
}
```

一门课下有多份笔记，或需要进一步嵌套时，使用文件夹路径：

```ts
folder?: {
  path: string[] // 例如 ['刑事诉讼法', '总论', '第一讲']
}
```

后续内容入口采用“文件夹浏览 + 右侧筛选”：左侧按 `folder.path` 浏览，右侧可按课程名、教师、日期、分类和 tag 筛选。

## Markdown frontmatter

示例：

```md
---
title: Markdown 内容中转示例
slug: notes/markdown-example
type: article
status: draft
visibility: private
access: private
category: 法律之上
tags: [示例, Markdown]
folder: 示例/Markdown
summary: 这是一个默认私有的 Markdown 内容快照示例。
---

# Markdown 内容中转示例
```

支持字段：

- `title`
- `slug`
- `type`
- `status`
- `visibility`
- `access`
- `category`
- `tags`
- `summary`
- `date`
- `folder`
- `course.name`
- `course.lesson`
- `course.teacher`
- `course.date`

未显式公开时，Markdown 导入默认生成私有草稿。
