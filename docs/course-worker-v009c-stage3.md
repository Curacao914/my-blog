# V009C 第三阶段：Scanner → Control Plane

## 本轮完成

- 远程 Worker 的可复用控制面客户端；
- 单一活跃 owner 自动绑定；
- V008/V009 安全目录批量同步；
- 全部新回放一次提交；
- 多课程去重；
- Worker 状态查询脚本；
- Node 网络客户端测试；
- 目录桥接安全测试；
- owner 解析 Jest 测试。

## 数据流

```text
教学网扫描器
→ platform-catalog-*.json
→ collectPipelineReplays()
→ POST /api/courses/pipeline
→ Supabase course_pipeline_tasks
```

本轮只提交：

```text
courseKey
replayKey
课程名
课次标题
时间
教师
```

不会提交观看地址或任何鉴权材料。

## 使用

```bash
export COURSE_CONTROL_PLANE_URL="https://preview.example"
export COURSE_WORKER_SECRET="..."

npm run course:pipeline:sync -- \
  --catalog /path/to/platform-catalog.json
```

查看状态：

```bash
npm run course:pipeline:status
```

## owner 绑定

当前只有一个活跃 owner 时，Worker 不需要额外 owner ID。未来出现多个
owner 时，再配置：

```text
COURSE_WORKER_OWNER_ID
```

## 下一阶段

将持久任务依次交给：

```text
V007 完整下载
V004 Paraformer
course-textpack.v1
/api/courses/textpack
现有课程 Workflow
DeepSeek Pro 错峰写作
媒体清理
```
