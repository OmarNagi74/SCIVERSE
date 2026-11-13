# TerraTwin final refinement report

## Result

TerraTwin’s Moon Explorer now uses a corrected full-globe **1024 × 512, 2:1 equirectangular PNG** rather than treating a 1024 × 449 GLD100-derived preview as if it represented 180 degrees of latitude. The original source remains untouched at `assets/source/moon-surface.jpg`; the served derivative is `client/public/assets/moon-surface-equirectangular.png`.

## Geographic mapping

- Source coverage: **79°N to 79°S** (158°), not pole-to-pole coverage.
- Output texture: **1024 × 512 PNG** with exact top-origin equirectangular boundaries:
  - **79°N:** `y = 31.288889`
  - **79°S:** `y = 480.711111`
- All 449 source rows contribute to the covered band. The two fractional boundary rows are area-mixed using only their covered portions; the 11° north and south caps use a deliberate abstract grid that communicates **no data**, not terrain.
- The R3F material uses the texture as color only. It does not derive bump, normal, displacement, elevation, or measurement data from the visual preview.

## Product and integrity refinements

- Moon Explorer labels equatorial/mid-latitude GLD100 coverage, gridded polar no-data areas, and selected South Pole / Shackleton contexts outside coverage.
- The default Moon view faces the South Pole more directly so the high-latitude context remains legible while all camera controls remain available.
- The in-app source dossier preserves NASA GIBS / Blue Marble, USGS GLD100, and USGS Viking Mosaic links and distinguishes visual orientation textures from analytical layers.
- Earth-candidate selection, comparison tray state, query-based direct comparison links, valid pair restoration, and invalid-link handling remain intact.
- Every one of the six comparison dimension cards now repeats the exact scientific boundary: **“DEMONSTRATION RUBRIC — NOT A SITE-SPECIFIC SCIENTIFIC ASSESSMENT.”**

## Repeatable validation

Run:

```bash
pnpm build:lunar-texture
pnpm validate:lunar-texture
pnpm check
pnpm build:static
```

The lunar validator checks 2:1 dimensions and PNG format, exact ±79° boundaries, full 449-row contribution, no-data-only fully uncovered caps, independent row-coded geographic alignment, renderer asset wiring, no false bump-map usage, and byte-for-byte equality between the checked display PNG and a freshly derived in-memory transform of the preserved source. A deliberate one-pixel corruption was confirmed to fail the integrity guard.

Final validation also covered all six SPA routes by HTTP response, live corrected lunar texture loading, selectable polar contexts, a Mars → Earth → Comparison workflow, valid and invalid direct comparison URLs, source links, and desktop/mobile screenshots.

## Remaining limits

The corrected PNG is still a reduced visual preview for orientation only. It is not an analytical raster or a source for terrain/elevation measurements. TerraTwin intentionally does not claim an analog score, NASA finding, or a completed scientific comparison until reviewed datasets and a documented method are integrated.
