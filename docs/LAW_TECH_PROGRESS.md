# law-tech.dev 工作台进度

更新时间：2026-06-27  
开发分支：\`codex/homepage-phase1\`  
Preview：\`https://preview.law-tech.dev\`  
Production：\`main\`，尚未合并本阶段工作。

## 当前已经完成

- Clerk 管理员鉴权已经在 Preview 跑通，服务端直接验证 Session，不依赖 Clerk Middleware。
- 工作台包含今日、随手记、阅读、事项、课程整理、写作、内容设置与系统页面。
- 课程资料支持浏览器读取、扫描资料 OCR、课次归档、课程偏好、大纲确认、节点写作、独立审查、局部修订、最终拼装。
- 审查分数兼容 0—10 与 0—100 两种模型输出；普通局部修订可与无依赖节点并行。
- 最终检查改为人工确认，最终笔记支持 Markdown 阅读视图、编辑和字数统计。
- 本轮增加最终笔记的“按要求修改”：只有用户主动提交意见时才调用修订模型。
- 本轮把原“材料”入口调整为“笔记库”，数据结构明确为“课程 → 课次 → 最终笔记”。
- 已完成课程会显示“查看笔记”，可从课程或笔记库继续增加课次。
- 课程原始文件不在网页服务端长期保存；浏览器工作流只保存提取文字和流程状态。

## 当前数据边界

- 课程是 \`course_jobs\` 中的一项工作流。
- 同一课程下可以有多个课次；每个课次拥有独立的大纲、节点、最终笔记和版本。
- 当前最终笔记仍保存在课程工作流的 \`lesson.finalNote\` 中。
- 笔记库暂时提供读取、继续修改和增加课次；单课次笔记的软删除、恢复和永久删除尚未实现。
- 公开主页内容库使用 Supabase content 表；课程最终稿到内容库的浏览器发布按钮尚未接通。
- Notion 单向镜像和旧博客统一索引尚未接通。

## 临时文件与容量

- 浏览器导入不会把原始课程文件持久化到 Vercel。
- OCR 完成后前端会请求删除 OCR 临时任务；OCR 服务自身仍需要保留超时兜底清理。
- 本地 Course Worker 的临时目录具有安全删除函数。
- 本轮增加 \`npm run course:worker:cleanup-temp\`，默认删除 24 小时前的本地课程临时目录。
- \`prepare-local\` 每次启动时也会执行一次过期目录清理。
- 这属于“每次运行时顺手清理”；真正按时钟运行的本机定时任务尚未配置。

## 接下来按顺序处理

1. Preview 验收本轮：最终修改意见、完成状态、悬浮任务状态、笔记库、增加课次。
2. 为笔记库增加课次级软删除、恢复与永久删除，并明确版本保留规则。
3. 打通课程最终稿 → 内容设置台 → Supabase 内容库 → 主页 /content。
4. 增加可选的 Notion 单向同步，Supabase 继续作为事实来源。
5. 统一旧博客文章与新内容库索引。
6. 配置 Production Clerk 环境变量并在明确批准后合并 main。
7. 开发每日 09:00 工作台摘要邮件。

## 本轮建议测试

\`\`\`bash
git diff --check

npx jest --runInBand \
  __tests__/lib/courseFinalRevision.test.js \
  __tests__/lib/courseNoteLibrary.test.js \
  __tests__/lib/courseWorkerTemp.test.js \
  __tests__/components/CourseLibraryUi.test.js \
  __tests__/components/CourseTextPackDesk.test.js

npm run build
\`\`\`

## 重要约束

- 未经明确批准，不合并或直接修改 \`main\`。
- Preview 与 Production 的 Clerk 环境变量需要分别配置。
- 任何模型自动修订都必须由流程规则或用户明确意见触发，不能在完成后自行继续消费额度。
