#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/run-backend.sh &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT INT TERM
ready=0
for attempt in {1..120}; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "Backend startup failed. Check the error above (port 8000 may already be occupied)." >&2
    exit 1
  fi
  if curl --silent --fail "http://127.0.0.1:${BACKEND_PORT:-8000}/api/v1/catalog" -o /dev/null; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then echo "Backend did not become ready." >&2; exit 1; fi
export BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT:-8000}}"
npm run dev:frontend
