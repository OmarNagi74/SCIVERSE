import { planetNames, type PlanetId } from "@/domain/terratwin";
import { LoaderCircle } from "lucide-react";

export default function PlanetFallback({ body, loading = false, error = false }: { body: PlanetId; loading?: boolean; error?: boolean }) {
  return (
    <div className={`planet-fallback planet-fallback--${body}`} role="img" aria-label={`${planetNames[body]} visualization ${error ? "unavailable" : "loading"}`}>
      <div className="planet-fallback__stars" />
      <div className="planet-fallback__halo" />
      <div className="planet-fallback__surface">
        <span className="planet-fallback__spot planet-fallback__spot--one" />
        <span className="planet-fallback__spot planet-fallback__spot--two" />
        <span className="planet-fallback__spot planet-fallback__spot--three" />
      </div>
      <div className="planet-fallback__caption">
        {loading && <LoaderCircle size={15} className="spin" />}
        <span>{error ? "VISUALIZATION UNAVAILABLE" : `INITIALIZING ${planetNames[body].toUpperCase()} SURFACE`}</span>
        <small>CONTROLS AND EVIDENCE REMAIN AVAILABLE</small>
      </div>
    </div>
  );
}
