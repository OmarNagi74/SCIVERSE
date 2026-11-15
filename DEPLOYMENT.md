# SciVerse deployment

The two application folders are `Frontend/` (Vite/React) and `backend/` (FastAPI).
`backend/research/` preserves the original offline scientific pipeline, inputs, learned weights and saved evaluations. Its scripts are reproducibility tools, not a second backend. The serving model under `backend/ai_service/vendor/` remains unchanged; do not replace it with the older research agent.

## Backend: blitz.cloud

Build from the backend folder. On Apple Silicon explicitly target Linux amd64:

```bash
docker buildx build --platform linux/amd64 -t YOUR_PUBLIC_REGISTRY/sciverse-backend:1 --push backend
```

Use a public Docker Hub or GHCR image. In blitz.cloud choose **Host something new → An app from Docker Hub**, supply that image and select port **8000**. The Dockerfile lives in `backend/`; its build context must also be `backend/`. The public-image deployment path avoids repository-root Dockerfile detection in this monorepo.

In the app Environment tab set:

| Variable | Value |
| --- | --- |
| `CORS_ORIGINS` | Exact HTTPS Vercel/custom frontend origin, without a trailing slash; comma-separate additional origins |
| `OPENROUTER_API_KEY` | Your server-side key, optional |
| `OPENROUTER_MODEL` | Your exact model ID, optional |
| `PORT` | `8000` |

Restart after environment changes. Local search needs no OpenRouter credentials. The Docker image includes the model datasets and saved AI results, runs as a non-root user, and binds on all interfaces. A single worker preserves the current in-process agent/lock behavior.

Check `/api/v1/agent/health` and `/api/v1/catalog` once startup completes. Model training happens during startup, so allow startup time. `/api/health` describes the separate legacy pipeline outputs and can report missing: `rankings.json` and `frontend_catalog.json` were not supplied with this repository. Use the `/api/v1` checks for the active frontend.

## Frontend: Vercel

Import the repository and set **Root Directory** to **Frontend** (case-sensitive).
The included `vercel.json` sets Vite, `npm ci`, `npm run build`, `dist/public`, and the SPA fallback for direct links and refreshes.

Set `VITE_API_BASE_URL` to the backend HTTPS origin, with no `/api` suffix. Redeploy after changing it: Vite embeds this public value at build time. `BACKEND_URL` is for the local Vite proxy only. Never add API keys to `VITE_*` variables.

After obtaining the Vercel domain, add that exact origin to backend `CORS_ORIGINS` and restart the backend. Check catalog loading, discovery, comparison, local assistant, and refreshing `/discovery` directly.

## Local development

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
bash run.sh
```

In a second terminal:

```bash
cd Frontend
npm ci
cp .env.example .env
npm run dev
```

The ignored `.env` files have already been created with local defaults and blank credentials. Hosting variables override backend `.env`. Scientific constants, source citations, model weights and request behavior are preserved.

## Checks

```bash
cd Frontend
npm run check
npm test
npm run build
```

```bash
cd backend
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

Optional texture/terrain generation tools remain in `Frontend/scripts/`; they are not part of deployment startup. External NASA imagery and scientific provenance URLs remain fixed to preserve source identity and rendering validation.

Provider references: [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite), [blitz.cloud Docker deployment](https://blitz.cloud/docs/deploy-docker-image/).

## Verification in this workspace

Passed: Python syntax parsing, retained frontend import resolution, JSON and Docker command parsing, npm lockfile consistency, shell syntax and `git diff --check`. Retained frontend source and serving scientific model/agent/data were verified byte-for-byte against Git; the relocated research files were also verified unchanged.

Full TypeScript checks, Vitest and Vite production build could not run because dependencies were not installed and network access to package registries failed. Python tests were blocked by the same dependency installation restriction. Docker image execution was blocked because the Docker daemon was not running. Run the commands above before publishing.
