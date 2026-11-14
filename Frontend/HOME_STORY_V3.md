# TerraTwin / Cinematic Story Home V3

The new Home page is a **guided interactive story** built on top of the V2 project. All explorer, discovery, comparison and terrain functionality from V2 remains in place.

## What was added

- **A more direct first screen:** immediate explanation of the workflow: choose a Moon/Mars region, discover Earth analog candidates, and compare evidence.
- **Live-looking, explicitly decorative motion:** drifting hero art, parallax, beacons, scan light, signal bars, orbit rings, and an animated scroll indicator. This is visual storytelling, **not live NASA telemetry**.
- **Choose your world:** an accessible Moon/Mars modal shown from the primary CTA. No more assuming every new user wants the Moon. The selection opens the corresponding existing Explorer route.
- **Three-step route strip in the hero:** Select a world → Find Earth sites → Compare evidence. Each item scrolls to a directly linked feature explanation.
- **Animated scrollytelling:** three custom illustrative scenes for reference selection, Earth discovery, and scientific comparison, with viewport reveal animations and a chapter rail.
- **One final CTA:** explore the world selector or open the mission science page.
- **Reading progress bar**, keyboard-visible focus, Escape and keyboard focus trapping in the chooser, mobile layouts, and reduced-motion support.
- **Performance precautions:** no new WebGL canvas, no new packages, existing compact texture assets reused, hero animation paused offscreen, scene animation paused when its chapter is not active.

## How to test locally

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev:frontend
# http://localhost:3000
```

Walkthrough: open `/`, click **START EXPLORING**, select Moon or Mars, verify the correct explorer opens; go back, scroll through the 3 scenes; test each step CTA; test keyboard Escape/Tab inside the chooser; test a narrow mobile viewport and OS **prefers-reduced-motion**.

## Scientific status

All story illustrations are clearly labeled as schematic or illustrative. The existing demonstration catalog still contains **demo records, not validated NASA similarity results**. No new science claims, ranking, scores, datasets or backend behavior were introduced in this iteration.

## Verification performed in this environment

TSX syntax transpilation with installed global TypeScript succeeds. The project cannot be production-built in this environment because package-manager installation is blocked by network/DNS access to the npm registry. Full browser validation (rendering, animation timing, accessibility and FPS) must be done after installing dependencies locally.
