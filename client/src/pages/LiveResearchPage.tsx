import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useExplorer } from "@/app/ExplorerContext";
import { AppHeader } from "@/components/terratwin/AppChrome";
import { features, getCandidate } from "@/data/catalog";
import { apiRequest } from "@/lib/sciverseApi";
import "./live-research.css";

const EarthMap = lazy(() => import("@/features/explorer/earth-cesium/EarthCesiumViewer"));
type Envelope<T> = { data: T; limitations: string[] };
type Detail = { id: string; classification: string; coordinate: { latitude: number; longitude: number }; facts: unknown; audit: unknown; rawFeatures: Record<string, string | number | null>; uncertaintyStatus: string };
type SearchRow = { earth_id: string; name: string; rank: number; score_pct?: number; scoreScale: string; details: Detail };
type Metadata = { objectives: Record<string, unknown>; regions: Record<string, unknown> };
function Evidence({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span>Missing</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  return <dl className="evidence-grid">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd><Evidence value={item} /></dd></div>)}</dl>;
}
export default function LiveResearchPage({ mode }: { mode: "discovery" | "comparison" | "profile" }) {
  const context = useExplorer();
  const [params] = useSearchParams();
  const { siteId } = useParams();
  const [target, setTarget] = useState(params.get("referenceId") || context.reference?.id || features[0]?.id || "");
  const [objective, setObjective] = useState(params.get("objective") || "general");
  const [region, setRegion] = useState("");
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [metaError, setMetaError] = useState("");
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [details, setDetails] = useState<Detail[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const queryIds = [params.get("candidateId"), ...params.getAll("candidateIds")].filter((id): id is string => Boolean(id));
  const ids = [...new Set(queryIds.length ? queryIds : context.comparisonCandidates.length ? context.comparisonCandidates.map(c => c.id) : context.candidate ? [context.candidate.id] : [])];
  const idKey = ids.join(",");
  useEffect(() => {
    const abort = new AbortController();
    setMetaError(""); setMeta(null);
    apiRequest<Envelope<Metadata>>("/objectives", undefined, abort.signal).then(r => setMeta(r.data)).catch(e => { if (!abort.signal.aborted) setMetaError(e.message); });
    return () => abort.abort();
  }, [attempt]);
  useEffect(() => {
    const abort = new AbortController();
    setRows([]); setActive(null); setDetails([]); setLimitations([]); setError("");
    if (!target || (mode === "comparison" && !idKey) || (mode === "profile" && !siteId)) { setBusy(false); return; }
    setBusy(true);
    async function fetchResults() {
      try {
        if (mode === "discovery") {
          const result = await apiRequest<Envelope<SearchRow[]>>("/discovery/search", { targetId: target, objective, region: region || null, limit: 100 }, abort.signal);
          if (!abort.signal.aborted) { setRows(result.data); setLimitations(result.limitations); }
        } else if (mode === "comparison") {
          const result = await apiRequest<Envelope<Detail[]>>("/comparisons", { targetId: target, objective, candidateIds: idKey.split(",") }, abort.signal);
          if (!abort.signal.aborted) { setDetails(result.data); setLimitations(result.limitations); }
        } else {
          const result = await apiRequest<Envelope<Detail>>(`/candidates/${encodeURIComponent(siteId!)}?targetId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`, undefined, abort.signal);
          if (!abort.signal.aborted) { setDetails([result.data]); setLimitations(result.limitations); }
        }
      } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Backend unavailable"); }
      finally { if (!abort.signal.aborted) setBusy(false); }
    }
    void fetchResults();
    return () => abort.abort();
  }, [target, objective, region, mode, siteId, idKey, attempt]);
  function chooseTarget(id: string) { setTarget(id); context.setReferenceById(id); }
  return <main className="live-research"><AppHeader active="earth" /><header><p className="eyebrow">SCIVERSE / BACKEND DATA</p><h1>{mode === "discovery" ? "Earth analog discovery" : mode === "comparison" ? "Compare research candidates" : getCandidate(siteId || "")?.title || "Site evidence"}</h1><p>Results are calculated by the backend for the selected reference and mission purpose.</p></header>
    <section className="live-controls"><label>Planetary reference<select value={target} onChange={e => chooseTarget(e.target.value)}>{features.map(f => <option key={f.id} value={f.id}>{f.body.toUpperCase()} — {f.title}</option>)}</select></label><label>Mission purpose<select value={objective} disabled={!meta} onChange={e => setObjective(e.target.value)}>{Object.keys(meta?.objectives || { general: null }).map(key => <option key={key} value={key}>{key.replaceAll("_", " ")}</option>)}</select></label>{mode === "discovery" && <label>Region<select value={region} disabled={!meta} onChange={e => setRegion(e.target.value)}><option value="">All supported regions</option>{Object.keys(meta?.regions || {}).map(key => <option key={key} value={key}>{key}</option>)}</select></label>}<button onClick={() => setAttempt(n => n + 1)}>Refresh</button><Link to={`/compare?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`}>Compare selected ({context.comparisonCandidates.length})</Link></section>
    {metaError && <p role="alert">Could not load mission options: {metaError}</p>}
    {busy && <p role="status">Loading backend results…</p>}{error && <p role="alert">{error} <button onClick={() => setAttempt(n => n + 1)}>Retry</button></p>}
    {!busy && !error && mode === "comparison" && !ids.length && <p>Select candidates in <Link to="/discovery">Discovery</Link> to compare them.</p>}
    {!busy && !error && mode === "discovery" && !rows.length && <p>No candidates returned for this query.</p>}
    {mode === "discovery" && !busy && !error && rows.length > 0 && <><div className="live-map"><Suspense fallback={<p>Loading map…</p>}><EarthMap selectedCandidateId={active} onSelectCandidate={id => { setActive(id); context.setActiveCandidateById(id); }} cameraAction={context.cameraAction} showCandidates visualLayerEnabled visibleCandidateIds={rows.map(row => row.earth_id)} /></Suspense></div><section className="live-cards">{rows.map(row => <article key={row.earth_id} className={active === row.earth_id ? "is-active" : ""}><h2>{row.rank}. {row.name}</h2>{typeof row.score_pct === "number" && <p>Score: {row.score_pct.toFixed(1)} / 100 · {row.scoreScale}</p>}<p>{row.details.coordinate.latitude}, {row.details.coordinate.longitude}</p><button onClick={() => { setActive(row.earth_id); context.setActiveCandidateById(row.earth_id); }}>Locate</button><button disabled={context.comparisonCandidates.length >= 20 && !context.comparisonCandidates.some(c => c.id === row.earth_id)} onClick={() => context.comparisonCandidates.some(c => c.id === row.earth_id) ? context.removeCandidateById(row.earth_id) : context.addCandidateById(row.earth_id)}>{context.comparisonCandidates.some(c => c.id === row.earth_id) ? "Remove from comparison" : "Add to comparison"}</button><Link to={`/sites/${encodeURIComponent(row.earth_id)}?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`}>Inspect evidence</Link></article>)}</section></>}
    {details.length > 0 && <section className="live-cards">{details.map(detail => <article key={detail.id}><h2>{getCandidate(detail.id)?.title || detail.id}</h2><p>{detail.coordinate.latitude}, {detail.coordinate.longitude} · {detail.classification}</p><h3>Target-specific comparison</h3><Evidence value={detail.facts} /><h3>Evidence audit</h3><Evidence value={detail.audit} /><details><summary>Dataset measurements and source fields</summary><Evidence value={detail.rawFeatures} /></details><p>Uncertainty: {detail.uncertaintyStatus}; no calibrated confidence interval supplied.</p></article>)}</section>}
    {!!limitations.length && <section className="live-limitations"><h2>Evidence limitations</h2><ul>{limitations.map(item => <li key={item}>{item}</li>)}</ul></section>}
  </main>;
}
