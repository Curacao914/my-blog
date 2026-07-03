> 本模板用于 Law-Tech 产品仓库。PR 必须区分代码存在、测试、Preview、Production 和自然周期证据。

## 目标

本 PR 要完成的唯一、可独立使用的闭环：

## 背景与根因

- 用户问题：
- 技术根因：
- 为什么不能用更小的临时补丁：

## 范围

### 包含

-

### 明确不包含

-

## 风险与数据

- 风险等级：只读 / 可逆写入 / 批量写入 / 破坏性 / 高权限
- 数据库变更：无 / additive migration / data repair
- 生产服务重启：无 / Relay / Gateway / 其他
- Secret 变化：无 / 有（不得在 PR 中粘贴值）

## 验收证据

- [ ] Targeted tests
- [ ] Relevant full tests
- [ ] TypeScript / ESLint（按变更边界）
- [ ] Production build
- [ ] Preview exact SHA
- [ ] 真实 E2E
- [ ] 自然周期（仅适用时）

请写明 exact head SHA、Preview URL 和命令/结果。不要把“未运行”写成“通过”。

## 发布与回滚

- 发布顺序：
- 备份：
- rollback tag/deployment：
- 回滚命令或步骤：
- smoke：

## 文档同步

- [ ] `docs/project/CURRENT-STATUS.md` / `CURRENT-STATE.json`（运行状态改变）
- [ ] `docs/project/PROJECT-LOG.md`（PR、发布或事故）
- [ ] `docs/project/ROADMAP.md`（优先级或范围改变）
- [ ] `docs/project/DECISIONS.md` / `AGENT-ARCHITECTURE.md`（架构或产品原则改变）
- [ ] `docs/project/LESSONS-LEARNED.md` / `OPERATIONS.md`（新事故或运维规则）
- [ ] `docs/project/HANDOFF.md`（接手边界改变）
- [ ] 本 PR 无需文档更新，理由：

凡在正文中引用 “current main / Production / database / Tencent runtime”，必须附核验日期和不可变 PR/commit/deployment 证据。

## 最终状态

- [ ] 未合并，仅 Preview
- [ ] 已合并到 main（填写 merge commit）
- [ ] Production 已部署 exact merge commit
- [ ] 数据库/腾讯云已同步
- [ ] 文档已反映最终事实
