#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../backend"
if [[ -f .env ]]; then set -a; source .env; set +a; fi
python_bin="${SCIVERSE_PYTHON:-$PWD/.venv/bin/python}"
if [[ ! -x "$python_bin" ]]; then
  previous="/Users/omarnagi/Documents/Codex/2026-11-13/new-chat-8/.venv/bin/python"
  if [[ -x "$previous" ]]; then python_bin="$previous"; else
    python3 -m venv .venv
    .venv/bin/python -m pip install -r requirements.txt
    python_bin="$PWD/.venv/bin/python"
  fi
fi
export PYTHONDONTWRITEBYTECODE=1
exec "$python_bin" -m uvicorn terratwin.main:app --host 127.0.0.1 --port "${BACKEND_PORT:-8000}"
