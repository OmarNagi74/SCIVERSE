# TerraTwin — Phase 2 implementation plan

This project implements the explicitly approved Phase 2 scope from the supplied brief and the completed Phase 1 product architecture. It is a frontend-only research-exploration prototype: no authentication, backend services, unavailable challenge datasets, or claim of NASA endorsement.

## Product path

The application begins with a cinematic landing page and guides a user into a three-body Explorer. The user may select a Moon or Mars reference feature, open clearly labeled demonstration Earth analog candidates, and review a dimension-by-dimension comparison. The selected body, reference, candidate, data state, coordinate convention, and available actions remain visible in the explorer shell.

## Rendering plan

Earth dynamically imports and mounts CesiumJS only on `/explorer/earth`. The implementation uses Cesium's base globe with a non-analytical visual presentation and demonstration markers. Moon and Mars dynamically import a shared React Three Fiber scene only on their routes. The non-Earth scene uses a reusable shader/material and body-specific configuration so that lunar craters, polar emphasis, and Martian surface treatment are visibly different rather than tint variants. Viewer failures fall back to an interactive CSS/HTML planetary surface with the same research controls.

## Design direction

**Chosen movement — Orbital instrument panel.** This is a cinematic mission-operations interface built around a dark observation aperture, with warm-orange mission calls and cyan measurement traces rather than a conventional card dashboard.

**Core principles.** The planet remains the dominant object. Panels behave as precise field instruments rather than opaque cards. Scientific status stays visible beside claims. Motion clarifies navigation, selection, and focus rather than decorating the surface.

**Color philosophy.** Near-black and blue-black surfaces recede to give planetary light and data signals depth. `#E57A35` provides a limited action/selection channel while `#46C7D9` represents coordinates, measurements, and interactive layers. Silver-white typography provides comfortable long-form reading.

**Layout paradigm.** An asymmetrical observation bay places the active planet in a central aperture, with a narrow controls instrument stack on the left, a contextual evidence module on the right, and a persistent telemetry band below. On the landing page, editorial composition and nested orbits replace a centered SaaS grid.

**Signature elements.** A segmented orbital body switcher, thin cyan coordinate rules, and clipped-corner translucent instrument panels appear across the app. A small six-point TerraTwin glyph marks the active research state without imitating any agency logo.

**Interaction and animation.** User actions reveal their consequence: body changes crossfade the aperture and update the status band; selected features pulse once; panels slide a short distance from the edge. Reduced-motion mode disables planetary auto-rotation and replaces camera transitions with instant state changes.

**Typography.** Space Grotesk supplies the precise scientific sans face for UI and headlines, while IBM Plex Mono distinguishes coordinates, telemetry, labels, and source IDs. The headline scale is deliberately editorial rather than rounded or marketing-led.

**Brand essence.** TerraTwin is a transparent planetary-analog research workspace for explorers who need to see both the connection and the caveat. It is rigorous, cinematic, and exploratory.

**Brand voice.** Direct, observant, and measured. Examples: “Select a reference area to begin an Earth analog query.” and “Similarity is dimensional. Inspect evidence before interpretation.”

**Wordmark and signature color.** The wordmark is an uppercase, spaced logotype preceded by a minimal paired-orbit glyph. Signal orange (`#E57A35`) is the deliberate mission-call color and is never used as general decoration.

## Technology and project structure

React, TypeScript, Vite, Tailwind CSS, React Router, Framer Motion, CesiumJS, Three.js, React Three Fiber, Recharts, and Lucide React are used as requested. No server or database is needed. The static production bundle will be declared in configuration.

```text
client/src/
  app/             Router and shared app providers
  components/      Shell, status, evidence, and reusable controls
  data/            Strongly typed centralized demonstration records
  domain/          Planet, feature, candidate, and comparison types
  features/
    landing/
    explorer/
      earth-cesium/
      planet-r3f/
    comparison/
  pages/           Route-level composition
  styles/          Global tokens and custom interface styles
public/            Route manifest and app assets
```

## Material constraints

An original non-text landing hero is generated only for the hero composition. Earth, Moon, and Mars in the actual interactive Explorer are renderer scenes; their visual surface treatments are explicitly labeled as visualization textures and never presented as analytical scientific layers. The app records the selected agency/USGS reference assets in `ASSET_SOURCES.md`. No NASA logo or insignia will be used.

## Delivery shape

The project serves through Vite on the configured port. It includes a `/manus-routes.json` manifest and a static build configuration. The result will be run, typechecked, built, and captured in desktop and mobile screenshots; a focused read-only validation checks that the connected components meet the supplied requirements.

## Focused quality refinement

This follow-up preserves the Phase 2 orbital-instrument visual identity, route layout, animation behavior, and split Cesium/Three rendering architecture. The Moon renderer will make the documented USGS GLD100 preview coverage explicit: only the visual band between 79°S and 79°N remains texture-presented, while both polar caps are deliberately rendered as non-textured coverage masks. South-polar reference points remain selectable, but the Explorer explicitly states that their image coverage is unavailable.

Comparison state remains client-only but becomes shareable via validated `referenceId` and `candidateId` query parameters. The shared context will use strict IDs rather than fallback substitution; Explorer actions will register the current Earth candidate before navigation, the tray will generate the scoped comparison URL, and direct URLs will restore valid records while gracefully showing incomplete or invalid links. The comparison copy will identify its centralized six-dimension content as a demonstration rubric, not a site-specific assessment. Existing source records will be exposed as links and short descriptions inside the Explorer, and the misleading Scenarios navigation alias will be removed.


## Lunar equirectangular correction

The original USGS-derived preview is 1024 × 449 pixels and represents the valid equatorial/mid-latitude band 79°N through 79°S (158°), not a full 180° image. Keep that JPEG untouched under `assets/source/`. Regenerate a lossless 1024 × 512 (2:1) equirectangular derivative by mapping the complete source image into the output’s exact ±79° latitude band; use fractional edge-aware resampling so both coverage boundaries remain geographically aligned and no valid source row is dropped. Only the actual polar areas receive the visibly distinct no-data grid treatment. Keep the original R3F globe UV mapping, source disclosure, South Pole/Shackleton selections, and no-data fallback behavior; add deterministic checks for dimensions, full source-row participation, independent geographic boundary and row-gradient alignment, polar treatment, absence of synthetic terrain, and the live renderer URL, without adding runtime packages or changing the visual design.


## Phase 3 — Global Analog Discovery and Site Profiles

Continue the existing orbital-instrument design system; do not redesign the landing page, Mission page, current Earth/Moon/Mars Explorers, or Comparison Laboratory. Add only the `/discovery` and `/sites/:siteId` product routes, using the existing header, palette, type, status badges, selection panels, source limitations, and reduced-motion/responsive conventions.

`DiscoveryPage` is the composition root for target-planet, environment, objective, dimension, text, and sort filters; active filter chips; result count; map/list state; candidate cards; and a multi-candidate tray. Keep its filter/search/sort/view state in the shared client context so moving to a Site Profile and back does not discard the active research query. Store additional candidate metadata once, beside the three stable IDs in `data/mockData.ts`, under typed demonstration-only fields; do not add candidates or fabricate coordinates. Reuse the existing lazy `EarthCesiumViewer` and its existing demo marker records/camera; extend only its selection/highlight API as needed so map and list selection remain synchronized. The page mounts one viewer, and the existing Earth Explorer behavior remains the unchanged default variant.

Add a validated multi-candidate collection to `ExplorerContext` while retaining the existing single `candidate` and `candidateId` contract for Explorer and direct comparison links. When multiple candidates are selected, preserve the current `referenceId` and `candidateId` URL parameters and append repeated validated `candidateIds` parameters; when there is only one, emit the unchanged legacy URL. The Comparison Laboratory retains its current single-candidate layout and gains an additional non-scoring candidate strip only when multiple valid IDs are supplied. Incomplete or invalid references/candidate IDs must not navigate as a valid pair.

`SiteProfilePage` resolves only an existing catalog ID, shows a recoverable not-found state for unknown IDs, uses the candidate’s existing location descriptor and existing coordinate for expressly illustrative map context only, and builds its dossier from centralized typed demo metadata, shared dimension statuses, source/status badges, and explicit missing-evidence copy. Its Explore, Compare, and Add actions use the shared context/URL builders so the user’s planetary reference and candidate selection survive route changes.

Extend `domain/terratwin.ts` with closed union types for requested environments and mission objectives and typed discovery/profile fields. Add `pages/DiscoveryPage.tsx`, `pages/SiteProfilePage.tsx`, focused reusable `features/discovery` controls/card/filter modules, and update `App.tsx`, the route manifest, the existing Earth viewer API only if necessary, the shared candidate-selection context/Comparison route only for compatible multi-select support, and the existing CSS. Use existing React, React Router, Cesium, Lucide, and CSS; do not install packages, perform dataset research, add external paid services, backend/authentication, or database requirements.


## Phase 4 — Frontend-only terrain, cinematic visualization, and performance

This phase remains strictly client-side. TerraTwin will continue to build as a React + TypeScript + Vite static site. It will not enable or modify Express deployment, tRPC procedures, database/Drizzle, authentication/OAuth, server-side processing, backend services, or existing backend files. Existing routes, Earth/Moon/Mars navigation, Discovery filters, Site Profiles, Comparison Laboratory, centralized demonstration records, scientific-integrity labels, and orbital-instrument visual identity remain intact.

### Terrain proof-of-concept

The bounded first terrain proof centers on the existing Tycho crater reference context. The selected official SLDEM2015 product supplies true LOLA/SELENE elevation data as 512-pixels-per-degree equirectangular tiles. The Tycho-area 45°E-wrapping source tile is subset offline into a compact local terrain grid; the existing global GLD100-derived color visualization texture remains separate and is mapped onto the regional mesh by geographic UVs. Runtime behavior does not download from or query any data service.

The relief will be limited to documented regional bounds, project source longitude/latitude into a local surface patch, apply only explicitly labeled display vertical exaggeration, and keep the remaining global Moon a color-textured sphere. Color imagery will never be treated as height. The viewport and source dossier will distinguish global visual imagery, the bounded SLDEM2015 source-derived relative terrain rendering, and no-data/out-of-patch areas. Polar reference contexts remain selectable and retain their existing GLD100 coverage warnings; Tycho relief is not extrapolated to them.

A reproducible local asset manifest will record source URLs, coordinate convention, region bounds, raster/encoding details, processing steps, dimensions, and checksums. The large upstream tile will not enter the shipped application. The compact derived assets will be source-controlled and validated deterministically for region, sample dimensions, finite values, no-data handling, output hashes, and renderer paths. No raw numerical elevation inspector, scientific comparison result, analog score, or site-specific finding is introduced.

### Cinematic renderer improvements

The existing R3F renderer will add an optional bounded terrain-detail focus mode, inertial camera focus on selected compatible references, lightweight animated selection rings/highlights, stronger directional/key/rim lighting, region-aware shadow/detail treatment, and visible rendering/terrain status. Existing routes are preserved. Earth remains the separately lazy-mounted Cesium scene and gains frontend render-on-demand, visibility-aware pause/resume, reduced-motion camera behavior, and resilient context/imagery error feedback without analytical terrain claims.

### Frontend performance and resilience

R3F will use conservative device-aware render profiles, adaptive DPR and geometry detail, progressive texture loading from compact preview to higher detail, demand-driven frames when inactive or when motion is reduced, resource disposal, texture-load feedback, and WebGL fallback. Cesium will use explicit request-render mode, safe rerender after state changes, offscreen/tab visibility throttling, conservative device scaling, and recoverable WebGL/imagery status. Existing lazy route/renderer imports remain. No runtime dependency or backend feature will be added.

### Scope limits

Mars remains a color-visualization explorer in this phase. The official Mars MOLA/HRSC and MOLA DEM products are documented as later candidates only; they are not embedded until a similarly bounded local terrain proof is selected. No scientific terrain comparisons, score, or measured claim will be introduced.
