#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." &&
  pwd
)"
WRAPPER="$ROOT/scripts/course-worker/run-with-network.sh"
LOG_DIR="$HOME/.law-tech-worker-logs"
STAMP="$(date '+%Y%m%d-%H%M%S')"
LOG_FILE="$LOG_DIR/course-e2e-pilot-$STAMP.log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

COURSE=""
TITLE=""
REPLAY_KEY=""
ARGS=("$@")

index=0
while [ "$index" -lt "$#" ]; do
  value="${ARGS[$index]}"
  case "$value" in
    --course)
      index=$((index + 1))
      COURSE="${ARGS[$index]:-}"
      ;;
    --title)
      index=$((index + 1))
      TITLE="${ARGS[$index]:-}"
      ;;
    --replay-key)
      index=$((index + 1))
      REPLAY_KEY="${ARGS[$index]:-}"
      ;;
  esac
  index=$((index + 1))
done

if [ -z "$REPLAY_KEY" ] && { [ -z "$COURSE" ] || [ -z "$TITLE" ]; }; then
  echo "用法："
  echo "  yarn course:pipeline:e2e-pilot --course \"国际法学\" --title \"2026-06-03\""
  echo "或："
  echo "  yarn course:pipeline:e2e-pilot --replay-key \"replay-...\""
  exit 1
fi

cd "$ROOT"

echo "Course Worker · controlled real E2E pilot"
echo "-----------------------------------------"
echo "日志：$LOG_FILE"
echo

echo "→ 环境与控制面预检"
"$WRAPPER" node scripts/course-worker/e2e-preflight.mjs

if [ -n "$COURSE" ]; then
  echo
  echo "→ 安全列出目标课程回放"
  "$WRAPPER" node scripts/course-worker/e2e-list.mjs --course "$COURSE"
fi

echo
echo "→ 启动唯一目标的真实端到端回归"
"$WRAPPER" node scripts/course-worker/e2e-run-one.mjs "$@"

echo
echo "✓ 真实单课回归命令已完成"
echo "日志：$LOG_FILE"
echo "回归报告：$HOME/.law-tech-course-worker/reports/"
