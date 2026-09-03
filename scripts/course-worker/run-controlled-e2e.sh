#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(
  CDPATH= cd -- "$(dirname -- "$0")/../.." &&
  pwd
)"
cd "$ROOT"

exec bash \
  scripts/course-worker/run-with-network.sh \
  node \
  scripts/course-worker/e2e-resilient.mjs \
  "$@"
