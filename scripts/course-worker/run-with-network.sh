#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." &&
  pwd
)"
MODE="${COURSE_PROXY_MODE:-auto}"
MEDIA_ROUTE="${COURSE_MEDIA_ROUTE:-direct}"

append_no_proxy() {
  local current="${NO_PROXY:-${no_proxy:-}}"
  local required="localhost,127.0.0.1,::1"

  case "$MEDIA_ROUTE" in
    direct)
      required="$required,pku.edu.cn,.pku.edu.cn"
      ;;
    proxy)
      ;;
    inherit)
      ;;
    *)
      echo "✗ COURSE_MEDIA_ROUTE must be direct, proxy, or inherit."
      exit 1
      ;;
  esac

  if [ -n "$current" ]; then
    export NO_PROXY="$current,$required"
  else
    export NO_PROXY="$required"
  fi
  export no_proxy="$NO_PROXY"
}

mask_proxy() {
  python3 - "$1" <<'PY'
from urllib.parse import urlsplit
import sys

try:
    parsed = urlsplit(sys.argv[1])
    host = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    print(f"{parsed.scheme}://{host}{port}")
except Exception:
    print("<configured>")
PY
}

has_explicit_proxy() {
  [ -n "${HTTPS_PROXY:-}" ] || \
  [ -n "${https_proxy:-}" ] || \
  [ -n "${HTTP_PROXY:-}" ] || \
  [ -n "${http_proxy:-}" ]
}

detect_macos_proxy() {
  [ "$(uname -s)" = "Darwin" ] || return 1
  [ -x /usr/sbin/scutil ] || return 1

  local exports
  exports="$(
    /usr/sbin/scutil --proxy |
      node "$ROOT/scripts/course-worker/system-proxy.mjs" --shell
  )"
  [ -n "$exports" ] || return 1
  eval "$exports"
}

case "$MODE" in
  off)
    echo "· Network proxy: disabled"
    ;;
  auto|required)
    if has_explicit_proxy; then
      export NODE_USE_ENV_PROXY=1
      proxy_value="${HTTPS_PROXY:-${https_proxy:-${HTTP_PROXY:-${http_proxy:-}}}}"
      echo "· Network proxy: explicit $(mask_proxy "$proxy_value")"
    elif detect_macos_proxy; then
      proxy_value="${HTTPS_PROXY:-${HTTP_PROXY:-}}"
      echo "· Network proxy: macOS system $(mask_proxy "$proxy_value")"
    elif [ "$MODE" = "required" ]; then
      echo "✗ Proxy required but none was detected."
      exit 1
    else
      echo "· Network proxy: direct"
    fi
    ;;
  *)
    echo "✗ COURSE_PROXY_MODE must be auto, required, or off."
    exit 1
    ;;
esac

append_no_proxy
echo "· PKU media route: $MEDIA_ROUTE"

[ "$#" -gt 0 ] || {
  echo "✗ run-with-network.sh requires a command."
  exit 1
}

if [ "$1" = "node" ] && [ "${NODE_USE_ENV_PROXY:-}" = "1" ]; then
  shift
  if node --help 2>&1 | grep -q -- '--use-env-proxy'; then
    exec node --use-env-proxy "$@"
  fi
  echo "✗ Node does not support --use-env-proxy."
  exit 1
fi

exec "$@"
