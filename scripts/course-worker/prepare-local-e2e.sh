#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." &&
  pwd
)"
cd "$ROOT"

CONFIG=".env.course-worker.local"
EXAMPLE="scripts/course-worker/.env.course-worker.example"
VENV=".venv-course-worker"

echo "Course Worker 本地真实回归环境准备"
echo "--------------------------------"

if [ ! -f "$CONFIG" ]; then
  cp "$EXAMPLE" "$CONFIG"
  chmod 600 "$CONFIG"
  echo "✓ 已创建私密配置：$ROOT/$CONFIG"
else
  chmod 600 "$CONFIG"
  echo "✓ 已保留现有私密配置：$ROOT/$CONFIG"
fi

if ! command -v brew >/dev/null 2>&1; then
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "✗ 未找到 Homebrew 或 ffmpeg。"
    echo "  请先安装 Homebrew，再重新运行本命令。"
    exit 1
  fi
else
  if \
    ! command -v ffmpeg >/dev/null 2>&1 || \
    ! command -v ffprobe >/dev/null 2>&1
  then
    echo "→ 安装 ffmpeg / ffprobe"
    brew install ffmpeg
  else
    echo "✓ ffmpeg / ffprobe 已安装"
  fi
fi

PYTHON_BIN="${COURSE_BASE_PYTHON:-python3}"
command -v "$PYTHON_BIN" >/dev/null 2>&1 || {
  echo "✗ 未找到 Python 3。"
  exit 1
}

if [ ! -x "$VENV/bin/python" ]; then
  echo "→ 创建课程 Worker Python 虚拟环境"
  "$PYTHON_BIN" -m venv "$VENV"
else
  echo "✓ Python 虚拟环境已存在"
fi

echo "→ 安装 Paraformer Worker Python 依赖"
"$VENV/bin/python" -m pip install \
  --disable-pip-version-check \
  --upgrade pip
"$VENV/bin/python" -m pip install \
  --disable-pip-version-check \
  -r scripts/course-worker/python/requirements-course-worker.txt

echo
echo "✓ 工具准备完成"
echo "私密配置文件：$ROOT/$CONFIG"
echo
echo "现在只需在该文件中填写缺失值。"
echo "已有 .env.local 中的同名配置会被自动读取；"
echo ".env.course-worker.local 会覆盖 .env.local，终端 export 优先级最高。"
echo
echo "→ 运行预检（缺少密钥时会正常返回未通过）"
set +e
yarn course:pipeline:e2e-preflight
STATUS=$?
set -e

echo
if [ "$STATUS" -eq 0 ]; then
  echo "✓ 预检已经全部通过"
else
  echo "⚠ 工具已准备好；按上方 missing / nextActions 补齐私密配置后重跑预检。"
fi
