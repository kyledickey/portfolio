#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# The Go server won't start without a built site to fall back on.
[[ -f dist/index.html && -f dist/404.html ]] || bun run build

trap 'kill 0' EXIT
go run ./cmd &
bun run dev
