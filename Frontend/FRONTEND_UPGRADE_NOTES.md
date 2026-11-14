# TerraTwin — Frontend UX Upgrade (Nov 13, 2026)

This is an implemented frontend update to the supplied prototype. It retains the Moon/Mars R3F scenes, Earth Cesium experience, the original candidate catalog, and the **real, bounded Tycho relief asset**. No API, server, machine-learning model, similarity-ranking claim, or new scientific measurement was invented.

## What changed

### P0 / usability and completeness

- **Comparison Lab** — multi-candidate active selection and removal, deep-link preservation, shareable comparison URL with clipboard fallback, **Inspect / Matrix** view modes, visual pair composition, six interactive research-dimension tabs and a clear empty-evidence inspector. Matrix data is demonstrational catalog metadata only, **not a scientific ranking**.
- **Site Profile** — sticky dossier navigation, cinematic conceptual terrain panel labeled as such, four evidence-availability tiles, interactive dimension inspector, improved visual hierarchy and existing research cautions preserved.
- **Guided Journey** — site-wide `GUIDE` button with an accessible four-step modal (planet > discover > dossier > compare), Escape key, Tab focus management, and contextual launch actions.
- **Session persistence** — validated, catalog-ID-based restoration of reference, active candidate, candidate set, and discovery filters using localStorage. Malformed storage falls back without guessing IDs.
- **Routing / sharing** — robust hash-section scroll even after lazy page loads; multi-candidate comparison URLs; correct Science/Mission nav highlight; explicit share-link fallback.
- **Standalone frontend** — removed unnecessary Manus platform script and tRPC client bootstrap for current frontend routes; trimmed Vite configuration to React + Tailwind + Cesium. Existing backend source is left untouched.
- **Accessibility / responsive** — more readable small text in improved panels, dialog keyboard management, labeled selectable controls, reduced-motion treatment, mobile layouts, removal of the zoom restriction.

### P1 / cinematic and interactive finishing

- **Mission** — graphical research journey, stylized world bridge, scientific-limits scene and links to relevant workflows.
- **Discovery** — Arid / Volcanic / Polar / Rover Testing quick-scan presets tied to the existing demonstration filters, animated tile hover and responsive preset deck.
- **Planetary Explorer** — active-region HUD and short, reduced-motion-aware planet-to-Earth departure when clicking **DISCOVER EARTH ANALOGS**. Existing planet focus/orbit rotation and the real Tycho relief workflow are preserved.
- **UI motion** — controlled reveal animations and visual hierarchy across the new lab, dossier, guided journey, and mission scenes.

## Run on your local machine

Requires Node 20+ (Node 22 recommended) and pnpm 10.18.0.

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev:frontend
```

Open `http://localhost:3000`.

For a static build:

```bash
corepack pnpm build:frontend
```

The build output is `dist/public/`. Host it on a service that supports SPA fallback to `index.html` for deep links such as `/compare?referenceId=...`.

The repo also preserves its original server and other commands. **Do not use `pnpm dev`** if you want the standalone frontend-only Vite server; that script starts the original Express server. Use `dev:frontend`.

### Suggested 2-minute demo flow

1. Open `/` and click **GUIDE**, then go to Mars Explorer.
2. Pick **Jezero Crater context**, click **SET AS REFERENCE**, then **DISCOVER EARTH ANALOGS**.
3. Try **VOLCANIC FIELDS** or **ROVER OPERATIONS** in Discovery; clear filters to restore all demo records.
4. Add two Earth candidates to the comparison tray, open **Comparison Lab**, switch active candidates, then test **INSPECT / MATRIX**.
5. Pick **Terrain** and **Geology** inspector tabs; observe **no comparable data** (correct, because no real scientific datasets are connected yet).
6. Open a **Site Dossier**, use the sticky section links and dimension inspector, then return to Compare.
7. Copy the comparison URL, refresh or open it in another tab to test recovery; try the desktop and mobile layouts.

## Scientific and technical boundaries

- The existing candidate locations and classifications remain illustrative, not validated analogous environments.
- No similarity %, AI prediction, confidence score, or NASA result has been fabricated.
- The new landscape previews are **concept art / UI visualizations**. They are explicitly labeled as *not site photography or source terrain data*.
- The bounded Tycho lunar relief remains the only site-specific elevation demonstration and retains its provenance manifest.
- The core rendered planets are visual textures, **not measurement products**.
- The offline source JP2 (`assets/source/SLDEM2015_512_60S_30S_315_360.JP2`) is required only for regenerating the Tycho asset using the dedicated scripts, not for viewing the prebuilt frontend. The **lightweight ZIP** excludes this 170 MB raw file; the full ZIP retains it.

## Verification performed here

- Parsed all 99 `client/src` TypeScript/TSX files with the TypeScript compiler parser — **0 syntax errors**.
- Exercised comparison URL builder for single/multi-candidate, deduplication, and incomplete selection states — **passed**.
- Checked required UX files, built Tycho terrain artifacts, link/viewport setup and saved-state code — **passed**.
- **Not completed in this execution environment:** install, production Vite compilation, real browser walkthrough, responsive screenshots, WebGL/Cesium FPS testing and accessibility auditing. The package registry was unavailable (`EAI_AGAIN`), so runtime and integration behavior must be verified on a machine with installed dependencies.

## Not yet implemented (do not mistake for done)

- Integration with real Earth/Moon/Mars datasets, backend services or scientific similarity metrics.
- Custom camera fly-throughs at every planetary hotspot; the current globe focus motion is preserved, plus an enhanced target overlay.
- Fully verified image-overlay comparison of real sites, terrain-aware charts, downloaded dossiers or measured uncertainty.
- Production performance profiling with high and low-end GPUs and complete screen-reader testing.

