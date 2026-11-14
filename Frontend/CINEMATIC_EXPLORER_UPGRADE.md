# TerraTwin — Cinematic Explorer V2 (13 Nov 2026)

This release extends `FRONTEND_UPGRADE_NOTES.md` without introducing a backend, new measurements, or made-up NASA-derived scientific results.

## Implemented in this release

### Actual Three.js camera motion (Moon / Mars)

- Feature selection triggers a **time-based, eased orbital camera dolly with a restrained sideways arc**, coordinated with the existing globe orientation-to-feature animation.
- `FOCUS REGION` replays the flight for the selected feature. `+`, `−` and `HOME` retain manual camera actions; orbit, wheel and pinch gestures **cancel scripted flights**.
- Keyed, demand-rendered transitions are frame-based (not a fake loading/scanning animation). The scene continues to respect reduced-motion preferences.
- Region markers have a larger transparent pointer target, a hover ring and an interactive pointer. The text-based feature list remains the accessible selection alternative.
- The **real, bounded Tycho relief mode** is preserved; no other site is presented as having verified 3D relief.

### Planet switching and UI microinteractions

- Planet switcher now runs a brief full-screen, CSS-only Earth/Moon/Mars hand-off, with a separate visual for the destination body. Users with reduced motion navigate immediately.
- Selection HUD gains previous/next planetary region controls and a live region counter, both connected to real catalog entries, not synthetic telemetry.
- Consistent hover, focus-visible, active-press and transition states; no continuous expensive particle effect has been introduced.

### Mobile navigation and accessibility

- New `CONTROLS` / `DETAILS` mobile buttons; only one instrument drawer is open at a time on narrow screens.
- Selecting an item on mobile reveals its details; pressing Escape closes the drawers; changing from desktop to mobile resets both drawers.
- Revised touch targets and positions for camera controls, target HUD, planet switch overlay and narrow viewports.
- Navigation closes the mobile menu when the route changes.

## Source data: keep what you need

- **Not needed to run the frontend:** `assets/source/SLDEM2015_512_60S_30S_315_360.JP2` (~170 MB, *compressed JPEG 2000 tile*). It is an offline source for rebuilding the Tycho relief visualization.
- **Needed to display the existing real Tycho proof:** `client/public/assets/terrain/tycho-sldem2015.i16` and `tycho-sldem2015.json`; these are included in the lightweight release.
- **For traceability and future reproducibility:** Keep `TERRAIN_SOURCES.md` and `scripts/build_tycho_terrain.py`. If regenerating the proof or improving the DEM sampling, the original JP2 (or a replacement official DEM covering Tycho with compatible processing) is needed.
- **For lunar south-pole research:** This specific SLDEM2015 tile **does not cover the south pole**; data for polar exploration must come from an appropriate polar product.
- Do not infer that any other NASA dataset contains the same elevation information solely because it is from NASA. Compare data **type, geographical bounds, resolution, coordinate reference and usage rights**.

## Test / build instructions

Requires Node 20+ and package dependencies installed (`pnpm`, lockfile in repository):

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev:frontend
# production static bundle
corepack pnpm build:frontend
```

Static artifacts are written to `dist/public/`; configure SPA fallback for deep URLs.

### Manual browser acceptance matrix

1. Desktop 1440×900: Moon → select Tycho → inspect camera dolly → `FOCUS REGION` replay → enter real Tycho relief → return to orbital mode.
2. Desktop: Mars → choose another indexed feature → globe rotates and camera moves → drag manually mid-flight to cancel it → zoom / reset / pause.
3. Switch Moon ↔ Mars ↔ Earth from the planet selector, both with standard and `prefers-reduced-motion: reduce` enabled.
4. Mobile 390×844 and 360×740: open CONTROLS, select an indexed region, see DETAILS open while CONTROLS closes, tap next/previous, close with Escape where keyboard exists.
5. Test touch pinch, 3D pointer hover/selection, and no WebGL context loss; use low-power GPU mode or Chrome performance tools to evaluate frame timing.
6. Visit Discovery, Site Profile and Comparison to ensure the prior P0 functionality remains unchanged.

### Verification performed here

- TypeScript parser successfully parsed all **99** TS/TSX source files (zero parser diagnostics).
- 12 static code / required-asset probes passed; CSS brace balance passed.
- Pure rendering policy checks for camera clamping and low-power tier passed in Node.
- **Not verified in this environment:** dependency installation, Vite production build, browser animations, measured FPS, WebGL context behavior, device screenshots. Package registry DNS lookup returned `EAI_AGAIN`. Do not treat the above static checks as an end-to-end test.
