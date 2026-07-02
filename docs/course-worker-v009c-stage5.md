# V009C 第五阶段：已验证组件的正式 Adapter

## 本轮完成

第五阶段将前期真实验证过的能力装入第四阶段 Runner：

```text
稳定回放身份重新定位
→ 自动登录或复用浏览器 profile
→ 捕获 HLS 清单
→ 六路完整下载与断点复用
→ ffmpeg 无损封装
→ 45 分钟切片
→ Paraformer-v2 转录
→ transcript-only course-textpack.v1
→ 使用 Worker Secret 上传
→ 自动确认默认课程偏好
→ DeepSeek Pro 错峰笔记工作流
→ 删除视频和 HLS 分片
```

## 媒体存储边界

完整视频只存在 Worker 的 scratch disk：

```text
$COURSE_WORKER_SCRATCH_DIR/replays/<replayKey>/
```

Supabase 仅记录相对 scratch key、checksum、阶段、统计信息和 course job ID，不保存视频、音频、播放地址或鉴权材料。

Paraformer 需要可公开读取的临时音频地址，因此每个 45 分钟 MP3 切片会暂存在 Cloudflare R2。DashScope 任务完成后立即删除对应对象；完整视频不会上传 R2。

## 必要环境变量

### 教学网

```text
PKU_USERNAME
PKU_PASSWORD
COURSE_BROWSER_PROFILE_DIR
COURSE_CHROME_PATH
```

### 控制面

```text
COURSE_CONTROL_PLANE_URL
COURSE_WORKER_SECRET
```

### Paraformer 与临时 R2

```text
DASHSCOPE_API_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT
R2_BUCKET
```

### 可选

```text
COURSE_HEADLESS=1
COURSE_DOWNLOAD_CONCURRENCY=6
COURSE_ASR_CHUNK_MINUTES=45
COURSE_AUTO_START_NOTES=1
COURSE_KEEP_TRANSCRIPT_LOCAL=1
COURSE_WORKER_SCRATCH_DIR=/data/course-worker
```

## Python 依赖

```bash
python3 -m venv .venv-course-worker
source .venv-course-worker/bin/activate
pip install -r scripts/course-worker/python/requirements-course-worker.txt
```

远程镜像应当在构建阶段完成依赖安装，不在每次任务启动时临时安装。

## 启动

```bash
npm run course:pipeline:run-validated
```

Runner 每次顺序处理一门课，队列为空后退出；单课内部仍使用六路 HLS 分片并发。

## 自动笔记

Worker TextPack 接口会调用 `save-course-spec` 自动完成 preflight。模型生成大纲后，`approve-outline-worker` 会在同一批次自动批准大纲，因此正常课程不会停在偏好确认或大纲确认。模型审查发现老师立场冲突、材料矛盾或质量风险时，原有人工门禁继续保留。

## 安全约束

- 不在 Supabase 保存教学网 URL、Cookie、JWT、Authorization；
- 不在日志输出完整媒体 URL；
- 不提交 `.env.local`、浏览器 profile 或 scratch 文件；
- R2 仅承载短期 MP3 切片；
- TextPack 只包含纯文字；
- 上传成功后才删除完整视频和 HLS 分片；
- 转录与 TextPack 默认暂留本地，待远程持久化回归通过后可关闭。

## 下一阶段

第五阶段只做离线回归和正式接线，不在安装补丁时访问教学网。下一阶段执行真实端到端回归：一门课、多门课、中断恢复、学校服务器故障和媒体清理。
