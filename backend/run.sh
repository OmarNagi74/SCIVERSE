#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
# main.py loads .env without overriding hosting environment variables.
exec "${SCIVERSE_PYTHON:-.venv/bin/python}" -c 'import os, uvicorn; from terratwin.main import app; uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8000")))'
