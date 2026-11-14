export type DeviceSignals = {
  cores?: number;
  memory?: number;
  coarsePointer?: boolean;
  reducedMotion?: boolean;
  devicePixelRatio?: number;
};

export type RenderProfile = {
  tier: "economy" | "balanced";
  dpr: number;
  segments: number;
  stars: number;
  fps: number;
  textureSize: 512 | 1024;
};

/** Conservative capability hints, not a claim to benchmark the user's GPU. */
export function chooseRenderProfile(signals: DeviceSignals): RenderProfile {
  const limited = Boolean(signals.coarsePointer || signals.reducedMotion ||
    (signals.cores !== undefined && signals.cores <= 4) ||
    (signals.memory !== undefined && signals.memory <= 4));
  return limited
    ? { tier: "economy", dpr: Math.min(signals.devicePixelRatio || 1, 1), segments: 64, stars: 220, fps: 20, textureSize: 512 }
    : { tier: "balanced", dpr: Math.min(signals.devicePixelRatio || 1, 1.5), segments: 96, stars: 650, fps: 30, textureSize: 1024 };
}

export function clampCameraDistance(distance: number, regional = false): number {
  return Math.max(regional ? 3 : 3.5, Math.min(regional ? 24 : 20, distance));
}

export function clampEarthCameraDistance(distance: number): number {
  return Math.max(1_400_000, Math.min(28_000_000, distance));
}
