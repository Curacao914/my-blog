# R2 图床与 Notion 最后正常版本中继

更新时间：2026-06-28

本阶段将旧 Notion 文章从“访问时实时依赖 Notion 私有接口”改为“管理员同步后读取最后一次成功快照”。正文、页面元数据、版本指针与资源清单保存在 Supabase；图片二进制只进入 Cloudflare R2，不进入 Supabase Storage。

## 已确定的资源

- Cloudflare Account ID：`5627873db128d04e0396781f999faea2`
- Bucket：`law-tech-assets`
- 公开域名：`https://assets.law-tech.dev`
- S3 Endpoint：`https://5627873db128d04e0396781f999faea2.r2.cloudflarestorage.com`
- PicGo 凭据：`picgo-upload`
- 网站中继凭据：`notion-relay`

Access Key ID 与 Secret Access Key 不得写入仓库、聊天、截图或文档。两套凭据必须保持分离。

## 一、先执行 Supabase 迁移

在 Supabase Dashboard 打开 SQL Editor，执行：

```text
lib/db/migrations/20260628_notion_relay.sql
```

该迁移创建：

- `notion_relay_batches`：一次完整同步；
- `notion_relay_snapshots`：按页面内容哈希去重的正文快照；
- `notion_relay_batch_pages`：批次与快照的对应关系；
- `notion_relay_state`：当前和上一批有效版本；
- `promote_notion_relay_batch`：一次事务内切换有效批次。

所有表都启用 RLS，但不创建浏览器访问策略。只有服务端 service role 可以读取和写入。

## 二、在 Vercel 填写中继变量

进入 Vercel 项目：

```text
Settings
→ Environment Variables
```

先选择 **Preview**，逐项添加：

```env
NOTION_RELAY_ENABLED=true
R2_ACCOUNT_ID=5627873db128d04e0396781f999faea2
R2_ENDPOINT=https://5627873db128d04e0396781f999faea2.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=law-tech-assets
R2_PUBLIC_BASE_URL=https://assets.law-tech.dev
R2_NOTION_PREFIX=notion
R2_NOTION_MAX_IMAGE_BYTES=15728640
R2_ACCESS_KEY_ID=<notion-relay 的 Access Key ID>
R2_SECRET_ACCESS_KEY=<notion-relay 的 Secret Access Key>
```

最后两项属于 Secret。只在 Vercel 表单中粘贴，不要发给任何模型，也不要放进 `NEXT_PUBLIC_` 变量。

保存后必须重新部署 Preview，旧 Deployment 不会自动获得新增环境变量。Preview 验收通过后，再把同一组非公开变量加入 Production；在合并 `main` 前不要提前把 `NOTION_RELAY_ENABLED` 打开到 Production。

本地测试时，把相同变量写入项目根目录的 `.env.local`。该文件已被 Git 忽略，不要修改 `.env.example` 中的占位符为真实 Secret。

## 三、PicGo 使用另一套凭据

PicGo 插件市场安装 `s3`，配置：

```text
Access Key ID：picgo-upload 的 Access Key ID
Secret Access Key：picgo-upload 的 Secret Access Key
Bucket：law-tech-assets
Endpoint：5627873db128d04e0396781f999faea2.r2.cloudflarestorage.com
Region：auto
Path style access：开启
上传路径：manual/{year}/{month}/{sha256}.{extName}
输出 URL：https://assets.law-tech.dev/{path}
```

R2 不支持对象 ACL。若插件界面要求 ACL，必须选择“不发送 / 留空 / none”。若当前插件版本强制发送 `public-read`，不要继续反复尝试；先保留 GitHub 上传器，并使用网站自带 R2 中继。PicGo 只负责日常手动图片，不参与 Vercel 上的自动 Notion 同步。

## 四、同步行为

管理员点击“同步内容”后：

1. 清除旧的 Notion 运行时缓存；
2. 实时读取 Notion 数据库与每篇公开页面；
3. 对页面 record map 做现有格式兼容处理；
4. 识别 Notion 托管的正文图片和页面封面；
5. 下载图片，计算 SHA-256；
6. 以 `notion/<sha256>.<扩展名>` 写入 R2；
7. 相同内容复用同一 R2 对象；
8. 把快照中的临时 Notion 地址替换为 `assets.law-tech.dev`；
9. 写入 Supabase staging 批次；
10. 所有页面成功后，事务切换 active batch；
11. 任一页面或关键图片失败时，标记本批失败，继续使用上一批。

外部稳定 HTTPS 图片保持原 URL，不重复搬运。第一版只镜像图片和页面封面，不镜像视频、音频、PDF 与普通附件。

## 五、Preview 验收

1. 重新部署后，以管理员身份点击“同步内容”；
2. 界面应显示中继文章数和镜像图片数；
3. 在 Supabase 查看 active batch；
4. 打开几篇包含 Notion 上传图片的旧文章；
5. Network 中图片应来自 `assets.law-tech.dev/notion/`；
6. 再次同步未修改文章，相同图片不应新增重复对象；
7. 临时撤掉一项 R2 Secret 后再次同步，接口应提示失败，但旧文章仍正常；
8. 恢复 Secret 后同步，新批次才会取代旧批次。

## 六、当前边界

- 页面详情和文章路径优先使用有效中继快照，没有快照时回退到现有 Notion 实时读取；
- `getStaticPaths` 也优先使用中继的全站元数据；
- 首页与统一公开内容索引仍保留现有 Notion/live JSON/Supabase 合并逻辑；
- R2 自定义域名负责图片公开读取，Supabase 不保存图片二进制；
- 自动删除未引用 R2 对象暂不启用，避免误删；内容哈希已经阻止重复存储。
