import { useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/sciverseApi";
import { loadCatalog } from "@/data/catalog";
import type { AnalogCandidate, PlanetFeature } from "@/domain/terratwin";
export default function CatalogGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    apiRequest<{ data: { features: PlanetFeature[]; candidates: AnalogCandidate[] } }>("/catalog", undefined, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) { loadCatalog(data); setReady(true); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [attempt]);
  if (!ready) return <main className="route-loading" style={{ flexDirection: "column", gap: 20 }}><h1>SciVerse</h1><p role={error ? "alert" : "status"}>{error || "Loading research catalog from backend…"}</p>{error && <><p>Start the research server, then retry.</p><button onClick={() => setAttempt(n => n + 1)}>Retry connection</button></>}</main>;
  return children;
}
