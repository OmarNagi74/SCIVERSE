<div align="center">

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:07111f,50:193b52,100:84cc7a&amp;height=220&amp;section=header&amp;text=SCIVERSE&amp;fontSize=68&amp;fontColor=e8f4f0&amp;animation=fadeIn&amp;fontAlignY=40&amp;desc=Explore%20Earth.%20Prepare%20for%20beyond.&amp;descAlignY=63&amp;descSize=19" alt="SciVerse — Explore Earth. Prepare for beyond." />

**A planetary analog research workspace connecting Earth, the Moon, and Mars.**

Discover candidate environments. Compare scientific features. Understand the limits.

![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi&logoColor=white)
![Research](https://img.shields.io/badge/Status-Research%20prototype-c7f36a?style=flat-square&labelColor=172532)

[The idea](#the-idea) · [Experience](#the-experience) · [Run locally](#run-locally) · [Ask SciVerse](#ask-sciverse) · [Science & limitations](#science--limitations)

</div>

---

## The idea

**Which places on Earth could help us prepare for exploring another world?**

SciVerse helps researchers, students, and mission-planning teams investigate that question. Choose a lunar or Martian reference, explore candidate Earth environments, and compare the features relevant to a research objective—such as rover mobility, thermal systems, or crew operations.

An Earth analog can reproduce selected aspects of an environment. SciVerse makes those similarities useful while keeping differences, missing measurements, and evidence limitations visible.

## The experience

| Explore | Discover | Compare | Ask |
| :--- | :--- | :--- | :--- |
| Navigate Earth, Moon, and Mars visualizations. | Search candidate terrestrial environments. | Inspect feature differences and recorded data-quality flags. | Turn a mission question into a tool-assisted research search. |

### 🌍 Planetary exploration

A React interface combines Three.js / React Three Fiber planetary scenes with a Cesium Earth viewer. Visual layers provide geographic orientation; their appearance does not establish scientific similarity.

### 🔬 Candidate discovery

The Python research engine ranks Earth records against planetary references using environmental features and mission-purpose weights. A model classifier provides an additional comparison, and candidate audits expose recorded limitations.

### ✨ Ask SciVerse

Two research modes share the same application:

- **Local search** uses an English rule-based planner to search the bundled dataset without an external language model.
- **AI research** uses an optional OpenRouter model to select bounded, read-only research tools. The application renders final recommendations from checked tool evidence.

The interface includes question suggestions, a conversation display, selected-reference context, readable research steps, answer copying, and a stop-waiting control. Each question is processed independently.

## Repository map

```text
SCIVERSE/
├── Frontend/               React + TypeScript + Vite interface
│   ├── client/             Pages, planetary views, and Ask SciVerse
│   └── scripts/            Frontend development helpers
├── backend/                FastAPI application
│   ├── terratwin/          API routes and response contracts
│   ├── ai_service/         Research runtime, OpenRouter, and guardrails
│   │   └── vendor/         Bundled model, agent, and feature datasets
│   └── tests/              API and guardrail checks
└── SciVerse/               Original scientific pipeline
    ├── data/               Earth and planetary feature tables
    ├── training/           Training inputs and learned weights
    └── outputs/            Saved scores, rankings, and evaluations
```

Some source modules retain the earlier **TerraTwin** name. The user-facing project is **SciVerse**.

## Run locally

Use **Python 3.11+**, **Node.js 22.12+**, npm, and Git. The first installation requires internet access.

### 1. Clone

```bash
git clone https://github.com/OmarNagi74/SCIVERSE.git
cd SCIVERSE
```

### 2. Start the backend

In your first terminal, from the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn terratwin.main:app --host 127.0.0.1 --port 8001
```

On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1` instead.

### 3. Start the frontend

In a second terminal, from the repository root:

```bash
cd Frontend
npm install
VITE_API_BASE_URL="" BACKEND_URL=http://127.0.0.1:8001 npm run dev:frontend
```

For Windows PowerShell, set the variables separately:

```powershell
$env:VITE_API_BASE_URL = ""
$env:BACKEND_URL = "http://127.0.0.1:8001"
npm run dev:frontend
```

| Service | Local address |
| :--- | :--- |
| Web interface | [localhost:3000](http://localhost:3000) |
| Interactive API documentation | [127.0.0.1:8001/docs](http://127.0.0.1:8001/docs) |
| Assistant health | [127.0.0.1:8001/api/v1/agent/health](http://127.0.0.1:8001/api/v1/agent/health) |

These instructions start each service directly and work with the sibling `Frontend/` and `backend/` layout.

<details>
<summary><strong>Optional: enable OpenRouter AI research</strong></summary>

In the backend terminal, export your own credentials before starting Uvicorn:

```bash
export OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY"
export OPENROUTER_MODEL="YOUR_EXACT_MODEL_ID"
python -m uvicorn terratwin.main:app --host 127.0.0.1 --port 8001
```

Keep credentials on the server and outside Git. The direct Uvicorn command does not automatically load a `.env` file. Provider availability, model access, and credits depend on your OpenRouter account.

AI research sends the question, included reference context, and tool data to OpenRouter and its selected model provider. Local search works without these credentials.

</details>

## Ask SciVerse

Give the assistant a **planetary target + research purpose + optional geographic constraint**.

> Find 3 Earth analog sites in Egypt for rover testing at Jezero crater on Mars.

> Find Earth analog sites for Artemis lunar crew training.

> Find Earth analog sites for lunar thermal systems testing.

> Find Mars rover testing sites outside polar regions.

Local search currently parses English. Explicit planetary requests take priority over a conflicting reference selected in the interface. Questions without a clear planetary target may require clarification.

### Research boundaries

Input validation, scope checks, a closed tool allowlist, typed tool arguments, known dataset identifiers, bounded result counts, a limited tool loop, and credential redaction provide multiple protective layers. Dataset and tool text are treated as untrusted content.

These controls reduce prompt-injection risk; they do not establish complete protection. The assistant has no general-purpose shell, arbitrary file-reading tool, or live web-search tool in its research loop.

## API at a glance

All paths below are relative to the backend origin.

| Method | Route | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/v1/agent/health` | Assistant configuration and guardrail version |
| `GET` | `/api/v1/agent/capabilities` | Research scope and limitations |
| `POST` | `/api/v1/agent/query` | Local mission search |
| `POST` | `/api/v1/agent/chat` | Optional OpenRouter-assisted search |
| `GET` | `/api/v1/targets` | Available planetary references |
| `GET` | `/api/v1/objectives` | Supported objectives and regions |
| `POST` | `/api/v1/discovery/search` | Structured candidate discovery |
| `POST` | `/api/v1/comparisons` | Compare selected candidates |

Try a local question:

```bash
curl http://127.0.0.1:8001/api/v1/agent/query \
  -H 'Content-Type: application/json' \
  -d '{"text":"Find Earth analog sites in Egypt for Mars rover testing at Jezero."}'
```

Use the generated [Swagger documentation](http://127.0.0.1:8001/docs) for request schemas and the complete route list.

## Science & limitations

**Scores are dataset-relative rankings, not physical similarity percentages or probabilities of mission success.**

- Candidate recommendations are exploratory and require source review and field verification.
- Coarse terrain sampling cannot characterize every local landform; a grid cell represents a survey region rather than a verified field site.
- Some coordinates are unverified and some model inputs are missing or imputed.
- Earth environments cannot reproduce all lunar or Martian gravity, atmospheric, and radiation conditions.
- Ice resources, biosignatures, subsurface conditions, and operational suitability are not established by a high rank.
- Local confidence labels are heuristic and uncalibrated. Similarity, classifier output, and evidence quality represent different concepts.

See the [scientific source notes](SciVerse/SOURCES.md) and [saved evaluation](SciVerse/outputs/ai_evaluation.json) for additional context. Recorded metrics describe the bundled evaluation, not independently validated mission performance.

## Development checks

```bash
# Frontend — run inside Frontend/
npm run check
npm test
npm run build:frontend
```

```bash
# Backend — run inside backend/ with its virtual environment active
python -m pip install pytest
python -m pytest tests -q
```

<details>
<summary><strong>Troubleshooting</strong></summary>

**Port already occupied:** stop the existing process you started, or select another backend port and update `BACKEND_URL` to match.

**Backend update required:** restart the backend after code changes, confirm that the frontend points to the same service, and refresh the page.

**AI mode unavailable:** configure both OpenRouter environment variables and restart the backend. Configuration status does not confirm provider connectivity.

**No result or rejected question:** specify Moon or Mars, a named reference, and a research objective. Use English in Local search.

</details>

---

<div align="center">

### Built around curiosity. Grounded in evidence.

**Earth is our starting point. Exploration is the question.**

<sub>Independent research prototype. Not an official NASA product and not endorsed by NASA.</sub>

</div>
