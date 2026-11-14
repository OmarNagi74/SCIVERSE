import { useEffect, useRef, useState } from "react";
import { chooseRenderProfile, type RenderProfile } from "./renderingPolicy";

export function useScenePolicy(reducedMotion: boolean) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [profile, setProfile] = useState<RenderProfile>(() => chooseRenderProfile({}));
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const updateProfile = () => setProfile(chooseRenderProfile({
      cores: navigator.hardwareConcurrency,
      memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      coarsePointer: coarse.matches,
      reducedMotion,
      devicePixelRatio: window.devicePixelRatio,
    }));
    updateProfile();
    coarse.addEventListener("change", updateProfile);
    return () => coarse.removeEventListener("change", updateProfile);
  }, [reducedMotion]);
  useEffect(() => {
    let intersecting = true;
    const sync = () => setVisible(intersecting && document.visibilityState !== "hidden");
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      sync();
    }, { threshold: 0.01 });
    if (hostRef.current) observer?.observe(hostRef.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  return { hostRef, visible, profile };
}
