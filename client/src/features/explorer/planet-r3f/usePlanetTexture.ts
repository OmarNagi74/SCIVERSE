import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type TextureStatus = "preview" | "loading" | "ready" | "unavailable" | "disabled";
export const FULL_MOON_TEXTURE = "/assets/moon-surface-equirectangular.png";

export function usePlanetTexture(body: "moon" | "mars", size: 512 | 1024, enabled: boolean, report: (status: TextureStatus) => void) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const { gl, invalidate } = useThree();
  useEffect(() => {
    let active = true;
    let current: THREE.Texture | null = null;
    const owned = new Set<THREE.Texture>();
    const loader = new THREE.TextureLoader();
    setTexture(null);
    report(enabled ? "loading" : "disabled");
    if (!enabled) { invalidate(); return; }
    const full = body === "moon" ? FULL_MOON_TEXTURE : "/assets/mars-surface.jpg";
    const detail = size === 512 ? `/assets/${body}-surface-compact.webp` : full;
    function show(loaded: THREE.Texture, status: TextureStatus) {
      if (!active) { loaded.dispose(); return; }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.wrapS = THREE.RepeatWrapping;
      loaded.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
      loaded.generateMipmaps = true;
      loaded.minFilter = THREE.LinearMipmapLinearFilter;
      const previous = current;
      current = loaded;
      setTexture(loaded);
      report(status);
      invalidate();
      if (previous && previous !== loaded) { previous.dispose(); owned.delete(previous); }
    }
    function loadDetail() {
      const high = loader.load(detail, (loaded) => show(loaded, "ready"), undefined, () => {
        if (!active) return;
        if (detail !== full) {
          const fallback = loader.load(full, (loaded) => show(loaded, "ready"), undefined, () => report(current ? "preview" : "unavailable"));
          owned.add(fallback);
        } else report(current ? "preview" : "unavailable");
      });
      owned.add(high);
    }
    const preview = loader.load(`/assets/${body}-surface-preview.webp`, (loaded) => {
      show(loaded, "preview");
      if (active) loadDetail();
    }, undefined, () => { if (active) loadDetail(); });
    owned.add(preview);
    return () => { active = false; for (const item of owned) item.dispose(); };
  }, [body, size, enabled, gl, invalidate, report]);
  return texture;
}
