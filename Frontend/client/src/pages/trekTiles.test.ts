import { describe, expect, it } from "vitest";
import { trekLayout } from "./trekTiles";

describe("lunar comparison imagery", () => {
  it("centres Shackleton ridge in south polar tiles instead of a stretched global strip", () => {
    const map = trekLayout("moon", -89.45, -137.31);
    expect(map.tiles[4].src).toContain("/SP/LRO_WAC_Mosaic_SPole60_100m_v02/1.0.0/default/default028mm/5/16/15.png");
    expect(map.fx).toBeCloseTo(0.834906);
    expect(map.fy).toBeCloseTo(0.178973);
    expect(map.widthKm).toBeGreaterThan(110);
    expect(map.tiles.every(t => t.src)).toBe(true);
  });
  it("keeps polar coordinates finite at both poles", () => {
    for (const lat of [-90, 90]) {
      const map = trekLayout("moon", lat, 0);
      expect(map.fx).toBe(0); expect(map.fy).toBe(0);
      expect(map.widthKm).toBeGreaterThan(110);
      expect(map.tiles[4].src).toContain(lat > 0 ? "/NP/" : "/SP/");
    }
  });
  it("retains equatorial imagery and wraps the antimeridian", () => {
    const map = trekLayout("moon", -43, 180);
    expect(map.polar).toBe(false);
    expect(map.tiles[3].src).toContain("/127.jpg");
    expect(map.tiles[4].src).toContain("/0.jpg");
    expect(trekLayout("mars", -89, 0).polar).toBe(false);
  });
});
