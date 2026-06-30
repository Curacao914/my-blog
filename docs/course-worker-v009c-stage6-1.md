# V009C 6.1：本地真实回归环境修复

## 修复内容

第六阶段第一次预检暴露的不是流水线错误，而是本机环境没有被新终端继承。
本轮完成：

- 修复 `e2e-preflight` 直接运行时不输出结果；
- 自动读取 `.env.local` 和 `.env.course-worker.local`；
- 终端 `export` 的值保持最高优先级；
- 自动将 `/opt/homebrew/bin` 和 `/usr/local/bin` 加入 Worker PATH；
- 自动识别 `.venv-course-worker/bin/python`；
- 自动识别此前验证过的 `~/.law-tech-course-browser-profile`；
- 自动识别 macOS Chrome；
- 提供一键安装 ffmpeg、创建 venv、安装 boto3 的准备脚本；
- 预检输出具体工具路径和下一步操作；
- 将私密配置和虚拟环境加入 `.gitignore`。

## 配置优先级

```text
终端 export
> .env.course-worker.local
> .env.local
> 自动检测默认值
```

所有真实密钥只保存在本机忽略文件中。

## 准备

```bash
yarn course:pipeline:e2e-prepare
```

该命令会：

1. 创建 `.env.course-worker.local`；
2. 安装 ffmpeg / ffprobe；
3. 创建 `.venv-course-worker`；
4. 安装 boto3；
5. 自动运行一次预检。

## 仍需人工填写的内容

```text
COURSE_CONTROL_PLANE_URL
COURSE_WORKER_SECRET
DASHSCOPE_API_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT
R2_BUCKET
```

教学网旧 profile 仍有效时可以不填账号密码；会话失效后再填写
`PKU_USERNAME` 和 `PKU_PASSWORD`。

## 安全

`.env.course-worker.local` 权限设为 `600`，不会被 Git 跟踪。预检只输出变量名、
路径与状态，不输出密钥值。
