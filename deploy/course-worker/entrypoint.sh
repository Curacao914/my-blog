#!/usr/bin/env bash
set -Eeuo pipefail

cd /app

case "${1:-cycle}" in
  cycle)
    exec node \
      scripts/course-worker/production-cycle.mjs \
      "${@:2}"
    ;;
  health)
    exec node \
      scripts/course-worker/production-health.mjs \
      "${@:2}"
    ;;
  inspect)
    exec node \
      scripts/course-worker/e2e-inspect.mjs \
      "${@:2}"
    ;;
  shell)
    exec /bin/bash
    ;;
  *)
    exec "$@"
    ;;
esac
