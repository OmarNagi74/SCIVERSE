# TerraTwin — Planetary Exploration

**TerraTwin** is an independent interactive prototype for examining a careful cross-planetary research question: which terrestrial environments might be worth studying alongside a selected lunar or Martian context, and what evidence or caveats would be required? Its product statement is **“Earth Is Our First Planetary Laboratory.”**

> **Scientific integrity notice:** Every Earth candidate record is labeled **“DEMO — NOT A SCIENTIFIC OBSERVATION.”** TerraTwin does not claim NASA affiliation, report NASA findings, fabricate measurements, or calculate a scientific analog score.

## What is implemented

- Cinematic landing page at `/` with the requested headline, mission CTA, original non-agency hero artwork, and a smooth route into the explorers.
- Responsive mission overview at `/mission` that explains the evidence-aware approach.
- Shared Explorer shell with global navigation, Earth/Moon/Mars switcher, search, feature selection, layer controls, camera controls, collapsible panels, selected-context details, comparison tray, status footer, reduced-motion CSS, and responsive layouts.
- **Earth Explorer** at `/explorer/earth`, lazily mounting a CesiumJS globe. NASA GIBS Blue Marble Shaded Relief & Bathymetry provides visual context where available; candidate markers use only the existing centralized demonstration records.
- **Moon Explorer** at `/explorer/moon`, lazily mounting a React Three Fiber / Three.js lunar sphere with a locally bundled, attributed USGS GLD100-derived preview texture and selectable lunar contexts. Its documented 79°S–79°N texture band is explicit; uncovered polar caps use a gridded no-data treatment. The preserved 1024 × 449 source is mapped to a 1024 × 512 equirectangular texture only within the ±79° band.
- **Mars Explorer** at `/explorer/mars`, lazily mounting a distinct React Three Fiber / Three.js Mars sphere with a locally bundled, attributed USGS Viking colorized-mosaic preview texture and selectable Martian contexts.
- **Global Analog Discovery** at `/discovery` with target-planet, environment, mission-objective, and research-dimension filters; search; active filter chips; clear-all; result counts and sorts; Map/List switching; a shared Cesium Earth map; synchronized candidate selection; and a multi-candidate comparison tray. Discovery facets and target scopes are explicitly demonstration metadata, not evidence of scientific similarity.
- **Analog Site Profile** at `/sites/:siteId` for validated catalog records. Its field-dossier sections show illustrative environment and mission prompts, shared rubric states, missing-data requirements, limitations, related Earth/Moon/Mars contexts, and actions that preserve the current in-app selection. Unknown IDs produce a recoverable not-found state without substituting a record.
- **Comparison Laboratory** at `/compare` for geology, terrain, temperature, water/ice, dust/wind, and operational relevance. It preserves the legacy `referenceId` and `candidateId` URL format and accepts additional unique `candidateIds` for a non-scoring multi-candidate set. Every dimension is explicitly labeled **“DEMONSTRATION RUBRIC — NOT A SITE-SPECIFIC SCIENTIFIC ASSESSMENT.”**
- In-app source dossier with links and descriptions for NASA GIBS visual context, USGS Lunar GLD100, and USGS Mars Viking Mosaic.

## Run locally

```bash
pnpm install
pnpm dev:static
```

The static Vite client listens on `http://localhost:3000` by default. Use the configured `PORT` environment variable to override the port if needed.

```bash
pnpm check          # TypeScript validation
pnpm test           # server and client Vitest suites
pnpm build:static   # production static build into dist/public
```

## Technology and module design

| Area | Implementation |
| --- | --- |
| Client | React + TypeScript + Vite + Tailwind foundation |
| Navigation | React Router |
| Motion | Framer Motion and `prefers-reduced-motion` safeguards |
| Earth | One reusable, lazy CesiumJS viewer shared by Earth Explorer and Discovery |
| Moon & Mars | Three.js / React Three Fiber / Drei, mounted only on the active route |
| UI | Custom orbital-instrument design system with Lucide React |
| Data | Centralized typed demonstration catalog in `client/src/data/mockData.ts` |
| Tests | Vitest coverage for every Discovery filter option, sort behavior, and legacy/multi-candidate comparison URL construction |

No backend or database is required. Reference, candidate, and Discovery filter/view state remain client-side across in-app navigation; direct comparison links restore only validated catalog IDs.

## Data integrity and limitations

The three Earth records and their existing coordinates are demonstration-only. On the Discovery globe they are explicitly marked as **illustrative map placements**, not verified observation locations; no new coordinates or scientific source records were created for this phase. Target-planet categories, filter facets, suggested applications, and rubric prompts are also labeled demonstration metadata. The prototype connects no reviewed site-specific scientific datasets, analytical terrain/climate/resource layers, or validated analog-ranking method, and it presents no numerical similarity percentage.

The Moon and Mars previews are visual textures, not georeferenced raster analysis layers and do not yield measurements. While a preview texture loads, or if it cannot be loaded, the globe remains neutral and surface details are withheld rather than procedurally invented. The full archival products would need a reviewed tiling, projection, caching, provenance, and scientific validation pipeline before an analytical layer is enabled. See [`ASSET_SOURCES.md`](./ASSET_SOURCES.md) for source provenance, local assets, attribution, and limitations, and [`FINAL_REFINEMENT_REPORT.md`](./FINAL_REFINEMENT_REPORT.md) for the earlier lunar-mapping correction record.

## Validation completed

- `pnpm check` — passed.
- `pnpm test` — passed: 32 tests across the server suites and the new Discovery filter/URL suite.
- `pnpm build:static` — passed; the eight-route manifest and direct SPA route responses were verified.
- All target-planet, environment, mission-objective, and dimension filters, name/location search, sorting, filter-chip removal, Clear All, Map/List switching, and candidate selection/add/remove flows were exercised or covered in client tests.
- The in-app Moon → Discovery → multi-candidate Comparison journey and legacy single-candidate direct URL were exercised. Valid multi-candidate URLs restore both Earth records; invalid IDs show a recovery notice and do not substitute other records.
- Valid and unknown Site Profile IDs, reference-context restoration, comparison actions, and Earth Explorer navigation were exercised.
- Desktop and mobile screenshots were reviewed for Discovery, Site Profile, the Comparison Laboratory, and the mobile Discovery map/bottom-sheet layout.

- Final in-app context regression: Moon reference + Mars target + Volcanic environment + Iceland search + environment sort + List view survived opening a Site Profile and returning to Discovery.
- A real Cesium marker click selected its corresponding Discovery candidate; the accessible card focus action changed the selected map candidate in the opposite direction.
- Related Moon context links and `Explore on Earth` restored the intended feature/candidate through shared in-app selection context.


## Phase 4 — Frontend terrain and rendering improvements

The project remains a static frontend. This phase does not enable or integrate Express, tRPC/API routes, authentication/OAuth, Drizzle/database, or server-side processing.

### Planet rendering

Earth remains the same lazy Cesium globe and reuses the same component in Global Discovery. It now uses request-render mode, conservative device resolution scaling, pauses when the document is hidden or its viewer is offscreen, respects reduced-motion camera preference, and reports optional imagery or WebGL context failures with a retry path. The Moon and Mars share the active-route-lazy R3F renderer and use small progressive WebP preview/compact texture assets before their source texture at the selected device tier. The R3F canvas uses conservative DPR/geometry tiers, a demand-render loop with throttled rotation only when visible, animation reduced/paused on low-end or hidden contexts, smoother selected-feature camera focus, lightweight marker emphasis, stronger directed/rim lighting, and context-loss fallback. A separate Tycho local relief mode is available only when the Tycho crater reference is selected.

### Lunar terrain proof

The terrain target is a small Moon-only patch for Tycho, at 40°–46°S and 15°–7°W. Its height input is the true numeric SLDEM2015 merged LOLA/SELENE elevation product, not color imagery. The source JPG2000 component is unsigned in Pillow’s decoder; the offline processor subtracts 32,768 to restore signed counts. Raw zero becomes the AUX `−32768` no-data value. Valid count metres are `count × 0.5 m`; the NASA/PDS LOLA FAQ documents the complete absolute-height formula `HEIGHT = (count × 0.5) + 1,737,400 m`. The viewer uses only relative relief around the sphere, not an absolute elevation readout. The official AUX sample range independently matches the bias conversion. The Tycho crop generates a sample relative-height range of −3,531 to +1,791.5 m. Only a 129×129 signed little-endian local grid is intended for public static delivery; the upstream 163 MB JP2 is excluded from Git and the app bundle. An offline script subsets that source, records SHA-256 provenance and a complete source-derived manifest, and validates exact output bytes, dimensions, encoding, source crop/mode, bounds, scale, no-data, height extrema, valid/no-data counts, and source hash. Local setup for a fresh checkout:

```bash
mkdir -p assets/source
curl -L --fail -o assets/source/SLDEM2015_512_60S_30S_315_360.JP2 \
  https://imbrium.mit.edu/EXTRAS/SLDEM2015/TILES/JP2/SLDEM2015_512_60S_30S_315_360.JP2
pnpm build:tycho-terrain
pnpm validate:tycho-terrain
```

The renderer keeps the existing GLD100-derived global color texture separate from elevation and maps color UVs according to geographic coordinates across the local relief mesh. Terrain is shown only within the stated Tycho bounds; no-data samples do not receive triangles. A clearly labeled 1×/3×/6× *display* exaggeration affects relief appearance, not stored source values. No elevation readout or site-specific assessment is exposed. The South Pole/Shackleton selections remain outside the GLD100 color-texture band and have no Tycho terrain coverage.

`TERRAIN_SOURCES.md` records the official product, PDS FAQ sample formula and radius offset, JP2 unsigned bias, no-data decoding, exact crop, coverage, coordinate convention, and evaluated but inactive Mars products. `ASSET_SOURCES.md` retains color-image provenance and limits. Mars has visual-only texture enhancements in this phase and no elevation terrain claim. WebP derivatives reduce transfer size; GPU-specific compressed KTX2 textures have not been generated.

### Phase 4 commands and validation

```bash
pnpm check
pnpm test
pnpm test:terrain-pipeline
pnpm build:planet-visuals
pnpm build:static
```

`pnpm validate:tycho-terrain` requires the official JP2 source and the generated static terrain files; it rebuilds the expected numeric subset in memory and rejects altered artifact bytes. Existing Phase 2/3 route, candidate, profile, demonstration, comparison, and discovery contracts remain in place.


## TerraTwin cinematic explorer update

See [CINEMATIC_EXPLORER_UPGRADE.md](CINEMATIC_EXPLORER_UPGRADE.md) for the Moon/Mars camera fly-through, planet hand-off transitions, mobile navigation changes and lunar source-file guidance.
