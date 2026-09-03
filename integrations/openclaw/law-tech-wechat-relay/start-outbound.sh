#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

: "${WECHAT_CAPTURE_TOKEN:?WECHAT_CAPTURE_TOKEN is required}"
: "${LAW_TECH_WECHAT_TARGET:=${WECHAT_OWNER:-}}"
: "${LAW_TECH_WECHAT_TARGET:?LAW_TECH_WECHAT_TARGET or WECHAT_OWNER is required}"

export LAW_TECH_BASE_URL="${LAW_TECH_BASE_URL:-https://law-tech.dev}"
exec node src/outbound-poller.js "$@"
