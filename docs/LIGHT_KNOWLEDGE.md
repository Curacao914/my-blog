# 轻知识

更新时间：2026-07-28
开发分支：`codex/light-knowledge-b`

## 产品边界

轻知识用于保存尚未发展成完整笔记或文章的探索材料。主页内置 AI 不参与知识获取：

1. 用户写下想了解的主题或问题；
2. 系统只生成可复制的外部模型提示词，并提供必要的格式与内容引导；
3. 用户在自行选择的模型中完成研究；
4. 将 Markdown、纯文本或包含 Markdown 与图片的 ZIP 导回工作台；
5. 在轻知识中阅读、修订、关联，必要时发展为写作。

提示词不预设固定章节或答案结构。产品不管理外部模型账号、对话或调用费用。

## 实现与数据

- 页面：`/desk/knowledge`、`/desk/knowledge/[id]`
- API：`/api/knowledge`、`/api/knowledge/[id]`、关联与私有资产子路由
- 主记录：复用 `content_items`、`content_versions`、`content_display`、`content_access`
- 扩展表：`knowledge_entries`、`knowledge_links`、`knowledge_assets`
- 类型与可见性：`type = knowledge`，始终为草稿和私有内容
- 正文：Markdown；图片保存在私有 Supabase Storage bucket
- 更新：通过 `law_tech_update_knowledge_entry` RPC 原子写入新版本和元数据
- 搜索：标题、摘要、正文、领域、主题和标签组合检索
- 关联：本地确定性规则提出建议，用户确认后才持久化；不调用 AI

随手记、阅读箱、课程笔记和今日页复用同一个“存为轻知识”入口。轻知识可复制到写作台继续发展，不改变原内容。

## 首页隐私

首页静态生成过程不读取轻知识。公开访问只看到通用入口；登录后，浏览器以同源身份请求本人明确勾选“首页展示”的最多三条标题。未授权、请求失败或没有条目时，不渲染任何私人知识文本。

## 导入限制

- 接受 `.md`、`.markdown`、`.txt`、`.zip`
- ZIP 只读取一个主 Markdown 文件及其引用图片
- 拒绝路径穿越、绝对路径、符号链接、超限文件、超限解压体积和不支持的资源类型
- 资源必须归属于同一用户、同一轻知识条目
- Markdown 中的本地图片引用在保存后改写为受保护的资产地址

## 发布前操作

代码合并或部署不会自动修改数据库。目标环境必须先执行：

```text
lib/db/migrations/20260728_light_knowledge.sql
```

迁移是增量式的，会创建扩展表、索引、RLS、私有 bucket 和事务 RPC。它复用现有 Supabase 配置，不增加环境变量。

验证层级必须分别记录：

1. 代码与专项测试；
2. 本地生产构建；
3. Preview 数据库迁移；
4. Preview 登录态真实导入、图片阅读和跨模块流转；
5. Production 迁移与真实使用。

当前分支只完成前两层；未经用户明确批准，不应用远端迁移、不部署 Preview、不合并 `main`。
