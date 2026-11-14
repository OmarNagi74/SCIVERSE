# SciVerse — Planetary Exploration

React planetary explorer connected to a local FastAPI research backend.

## SciVerse backend integration

The active backend is `backend/` in this repository. Dataset CSVs are in
`backend/ai_service/vendor/data/`. The old backend folder is no longer the source
for this frontend; its existing Python environment may be reused by the launcher.

```bash
npm install
npm run dev:all
```

Open http://localhost:3000. Alternatively run `npm run dev:backend` and
`npm run dev:frontend` in separate terminals. For another machine, the launcher
creates `backend/.venv` and installs `backend/requirements.txt`.

The explorer loads `/api/v1/catalog`; discovery requests `/api/v1/discovery/search`;
site profiles request `/api/v1/candidates/{id}`; comparison requests
`/api/v1/comparisons`. Purpose and region choices come from `/api/v1/objectives`.
There are no prefilled frontend candidate records or fallback scientific scores.
Backend failures show an error and retry control; empty searches stay empty.
The assistant calls `/api/v1/agent/query` or the optional `/api/v1/agent/chat`.
OpenRouter settings belong only in `backend/.env` (gitignored).

Vite and production Express proxy `/api/v1` to localhost:8000. Set `BACKEND_URL`
for a different server. For static hosting, build with `VITE_API_BASE_URL` set to
the backend origin and configure backend CORS for the frontend origin.
Never put provider secrets in a VITE variable.

The imported dataset contains incomplete and unverified measurements. Results
are exploratory hypotheses, with backend provenance and uncertainty limitations.
Globe imagery remains a visual layer, not an analytical measurement layer.

## Verification

Three backend contract tests cover catalog coordinates, discovery/profile/comparison
consistency, and empty/invalid queries. Run from `backend/`:

```bash
python -m unittest discover -s tests -v
```

Frontend checks: `npm run check`, `npm test`, and `npm run build:frontend`.
These were not run for this integration because npm registry access was unavailable
in the editing environment. Browser end-to-end verification is still required.

See `ASSET_SOURCES.md` for globe texture attribution and visual coverage limits.
