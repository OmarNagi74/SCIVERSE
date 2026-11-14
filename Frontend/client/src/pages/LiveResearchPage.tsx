import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useExplorer } from "@/app/ExplorerContext";
import { AppHeader, StatusBadge } from "@/components/terratwin/AppChrome";
import { ArrowLeft, ArrowUpRight, MapPin, RotateCcw, X } from "lucide-react";
import { features, getCandidate } from "@/data/catalog";
import { apiRequest } from "@/lib/sciverseApi";
import "./live-research.css";
import CompareHud from "./CompareHud";

const EarthMap = lazy(() => import("@/features/explorer/earth-cesium/EarthCesiumViewer"));
type Envelope<T> = { data: T; limitations: string[] };
type Detail = { id: string; classification: string; coordinate: { latitude: number; longitude: number }; facts: unknown; audit: unknown; rawFeatures: Record<string, string | number | null>; uncertaintyStatus: string };
type SearchRow = { earth_id: string; name: string; rank: number; score_pct?: number; scoreScale: string; details: Detail };
type Metadata = { objectives: Record<string, unknown>; regions: Record<string, unknown> };
export default function LiveResearchPage({ mode }: { mode: "discovery" | "comparison" | "profile" }) {
  const context = useExplorer();
  const [params, setParams] = useSearchParams();
  const requestedTarget = params.get("referenceId");
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
  useEffect(() => { if (requestedTarget) setTarget(requestedTarget); }, [requestedTarget]);
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
          const result = await apiRequest<Envelope<SearchRow[]>>("/discovery/search", { targetId: target, objective, region: region || null, limit: 12 }, abort.signal);
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
  function chooseTarget(id: string) { setTarget(id); context.setReferenceById(id); setParams(current => { const next = new URLSearchParams(current); next.set("referenceId", id); return next; }); }
  const refFeature = features.find(f => f.id === target);
  const purposeLabel = objective.replaceAll("_", " ");
  const siteRecord = getCandidate(siteId || "");
  function removeCandidate(id: string) {
    context.removeCandidateById(id);
    setParams(current => { const next = new URLSearchParams(current); const rest = [current.get("candidateId"), ...current.getAll("candidateIds")].filter((x): x is string => Boolean(x) && x !== id); next.delete("candidateId"); next.delete("candidateIds"); rest.forEach(x => next.append("candidateIds", x)); return next; });
  }
  function clearSelection() { context.clearCandidateSelections(); setParams(current => { const next = new URLSearchParams(current); next.delete("candidateId"); next.delete("candidateIds"); return next; }); }
  return <main className={`live-research live-research--${mode}`}><AppHeader active={mode === "comparison" ? refFeature?.body : "earth"} />
    {mode === "discovery" && <header className="discovery-header"><div><p className="eyebrow">TERRESTRIAL REFERENCE WORKSPACE / 03</p><h1>GLOBAL ANALOG <em>DISCOVERY</em></h1><p>Earth sites ranked by the SciVerse backend for the selected Moon or Mars reference and mission purpose.</p></div><div className="discovery-header__telemetry" aria-label="Current discovery context"><div><span>REFERENCE PLANET</span><strong>{refFeature ? refFeature.body.toUpperCase() : "UNSET"}</strong></div><div><span>SELECTED REGION</span><strong>{refFeature?.title ?? "SELECT A REFERENCE"}</strong></div><div><span>MISSION PURPOSE</span><strong>{purposeLabel.toUpperCase()}</strong></div><StatusBadge status="hypothesis" compact /></div></header>}
    {mode === "comparison" && <section className="compare-hero"><Link to={`/explorer/${refFeature?.body ?? "moon"}`} className="back-link"><ArrowLeft size={15} /> RETURN TO EXPLORER</Link><div className="compare-hero__heading"><div><p className="eyebrow">CROSS-PLANETARY COMPARISON LAB / 01</p><h1>INSPECT THE <em>ANALOGY.</em></h1></div><StatusBadge status="hypothesis" /></div><p className="compare-hero__lede">Each Earth candidate is set beside the selected reference, measurement by measurement, using the SciVerse backend dataset. Ranks are dataset percentiles, not a validated similarity score.</p></section>}
    {mode === "profile" && <section className="compare-hero"><Link to={`/discovery?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`} className="back-link"><ArrowLeft size={15} /> RETURN TO DISCOVERY</Link><div className="compare-hero__heading"><div><p className="eyebrow">SITE DOSSIER / EARTH CANDIDATE</p><h1>{siteRecord?.title || "Site evidence"}</h1></div><StatusBadge status="hypothesis" /></div><p className="compare-hero__lede">{siteRecord?.region ? <><MapPin size={14} /> {siteRecord.region}. </> : null}Backend evidence for this site against the selected reference and mission purpose.</p></section>}
    <section className="live-controls"><label>Planetary reference<select value={target} onChange={e => chooseTarget(e.target.value)}>{features.map(f => <option key={f.id} value={f.id}>{f.body.toUpperCase()} — {f.title}</option>)}</select></label><label>Mission purpose<select value={objective} disabled={!meta} onChange={e => setObjective(e.target.value)}>{Object.keys(meta?.objectives || { general: null }).map(key => <option key={key} value={key}>{key.replaceAll("_", " ")}</option>)}</select></label>{mode === "discovery" && <label>Region<select value={region} disabled={!meta} onChange={e => setRegion(e.target.value)}><option value="">All supported regions</option>{Object.keys(meta?.regions || {}).map(key => <option key={key} value={key}>{key}</option>)}</select></label>}<button onClick={() => setAttempt(n => n + 1)}>Refresh</button><Link to={`/compare?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`}>Compare selected ({context.comparisonCandidates.length})</Link></section>
    {metaError && <p role="alert">Could not load mission options: {metaError}</p>}
    {busy && <p role="status">Loading backend results…</p>}{error && <p role="alert">{error} <button onClick={() => setAttempt(n => n + 1)}>Retry</button></p>}
    {!busy && !error && mode === "comparison" && !ids.length && <section className="comparison-empty"><div className="comparison-empty__diagram"><span className="comparison-empty__body comparison-empty__body--moon" /><i /><span className="comparison-empty__body comparison-empty__body--earth" /></div><p className="eyebrow">COMPARISON NOT YET SCOPED</p><h2>Choose a planetary reference and an Earth candidate.</h2><p>Pick a Moon or Mars reference above, then add Earth candidates from Discovery.</p><div><Link className="mission-button mission-button--primary" to={`/discovery?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`}>OPEN GLOBAL DISCOVERY <ArrowUpRight size={15} /></Link></div></section>}
    {!busy && !error && mode === "discovery" && !rows.length && <p>No candidates returned for this query.</p>}
    {mode === "discovery" && !busy && !error && rows.length > 0 && <><p role="status" data-testid="discovery-results-summary">Top {rows.length} Earth candidates for <strong>{features.find(f => f.id === target)?.title || target}</strong> · {objective.replaceAll("_", " ")}. The map shows this shortlist; sites can recur across targets with different ranks and scores.</p><div className="live-map"><Suspense fallback={<p>Loading map…</p>}><EarthMap selectedCandidateId={active} onSelectCandidate={id => { setActive(id); context.setActiveCandidateById(id); }} cameraAction={context.cameraAction} showCandidates visualLayerEnabled visibleCandidateIds={rows.map(row => row.earth_id)} /></Suspense></div><section className="live-cards">{rows.map(row => <article key={row.earth_id} className={active === row.earth_id ? "is-active" : ""}><h2>{row.rank}. {row.name}</h2>{typeof row.score_pct === "number" && <p>Score: {row.score_pct.toFixed(1)} / 100 · {row.scoreScale}</p>}<p>{row.details.coordinate.latitude}, {row.details.coordinate.longitude}</p><button onClick={() => { setActive(row.earth_id); context.setActiveCandidateById(row.earth_id); }}>Locate</button><button disabled={context.comparisonCandidates.length >= 20 && !context.comparisonCandidates.some(c => c.id === row.earth_id)} onClick={() => context.comparisonCandidates.some(c => c.id === row.earth_id) ? context.removeCandidateById(row.earth_id) : context.addCandidateById(row.earth_id)}>{context.comparisonCandidates.some(c => c.id === row.earth_id) ? "Remove from comparison" : "Add to comparison"}</button><Link to={`/sites/${encodeURIComponent(row.earth_id)}?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`}>Inspect evidence</Link></article>)}</section></>}
    {mode === "comparison" && details.length > 0 && <div className="lab-candidate-strip live-strip" role="group" aria-label="Earth candidates in this comparison">{details.map((d, i) => <div className="lab-candidate" key={d.id}><button type="button" onClick={() => document.getElementById(`cmp-${d.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>{String(i + 1).padStart(2, "0")} / {d.classification}</span><strong>{getCandidate(d.id)?.title || d.id}</strong><small>{getCandidate(d.id)?.region || `${d.coordinate.latitude}, ${d.coordinate.longitude}`}</small></button><button type="button" className="lab-candidate__remove" title="Remove from comparison" aria-label={`Remove ${getCandidate(d.id)?.title || d.id} from comparison`} onClick={() => removeCandidate(d.id)}><X size={14} /></button></div>)}<Link className="lab-candidate lab-candidate--add" to={`/discovery?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`}><span>EXPAND YOUR STUDY</span><strong>+ ADD EARTH SITE</strong><small>Return to discovery</small></Link></div>}
    {details.length > 0 && <CompareHud details={details} targetId={target} />}
    {mode === "comparison" && details.length > 0 && <section className="comparison-actions"><Link to={`/sites/${encodeURIComponent(details[0].id)}?referenceId=${encodeURIComponent(target)}&objective=${encodeURIComponent(objective)}`} className="mission-button mission-button--secondary"><MapPin size={15} /> OPEN SITE DOSSIER</Link><Link to={`/explorer/${refFeature?.body ?? "moon"}`} className="mission-button mission-button--secondary">ADJUST REFERENCE <ArrowUpRight size={15} /></Link><button type="button" onClick={clearSelection} className="clear-comparison"><RotateCcw size={15} /> CLEAR CURRENT SELECTION</button></section>}
    {!!limitations.length && <section className="live-limitations"><h2>Evidence limitations</h2><ul>{limitations.map(item => <li key={item}>{item}</li>)}</ul></section>}
  </main>;
}
