import { buildComparisonUrl } from "@/app/comparisonUrl";
import { useExplorer } from "@/app/ExplorerContext";
import { AppHeader, StatusBadge } from "@/components/terratwin/AppChrome";
import { candidates, comparisonDimensions, getCandidate, getFeature } from "@/data/mockData";
import type { AnalogCandidate, ResearchDimensionId } from "@/domain/terratwin";
import { planetNames } from "@/domain/terratwin";
import { AlertTriangle, ArrowLeft, ArrowUpRight, Check, ClipboardCopy, FlaskConical, Grid2X2, Layers3, MapPin, MoveRight, RotateCcw, ShieldAlert, X } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const statusChartPalette = {
  demonstration: "#e7b84b",
  hypothesis: "#e57a35",
  missing: "#8797a4",
  "not-comparable": "#d9785e",
};

const statusCountData = ["demonstration", "hypothesis", "missing", "not-comparable"].map((status) => ({
  key: status as keyof typeof statusChartPalette,
  label: status === "not-comparable" ? "Not comparable" : status === "demonstration" ? "Demo state" : status === "missing" ? "Missing" : "Hypothesis",
  count: comparisonDimensions.filter((dimension) => dimension.status === status).length,
})).filter((item) => item.count > 0);

function validReference(id: string | null) {
  const feature = id ? getFeature(id) : undefined;
  return feature && feature.body !== "earth" ? feature : undefined;
}

function uniqueCandidateRecords(ids: string[]) {
  const seen = new Set<string>();
  return ids.flatMap((id) => {
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const record = getCandidate(id);
    return record ? [record] : [];
  });
}

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { reference, candidate, comparisonCandidates, clearComparison, removeCandidateById, setActiveCandidateById, setComparisonByIds, setComparisonCandidateIds } = useExplorer();
  const [activeDimension, setActiveDimension] = useState<ResearchDimensionId>("terrain");
  const [workspaceView, setWorkspaceView] = useState<"inspect" | "matrix">("inspect");
  const [copied, setCopied] = useState(false);
  const [shareText, setShareText] = useState<string | null>(null);
  const referenceId = searchParams.get("referenceId");
  const candidateId = searchParams.get("candidateId");
  const additionalCandidateIds = searchParams.getAll("candidateIds");
  const hasQuerySelection = referenceId !== null || candidateId !== null || additionalCandidateIds.length > 0;
  const queryReferenceRecord = validReference(referenceId);
  const requestedCandidateIds = [...new Set([candidateId, ...additionalCandidateIds].filter((id): id is string => Boolean(id)))];
  const queryHasInvalidReference = referenceId !== null && !queryReferenceRecord;
  const queryHasInvalidCandidate = requestedCandidateIds.some((id) => !getCandidate(id));
  const queryHasInvalidId = queryHasInvalidReference || queryHasInvalidCandidate;
  const queryCandidateRecords = queryHasInvalidId ? [] : uniqueCandidateRecords(requestedCandidateIds);
  const queryCandidateRecord = queryHasInvalidId ? undefined : (candidateId ? getCandidate(candidateId) : queryCandidateRecords[0]);
  const queryCandidateRecordIds = queryCandidateRecords.map((record) => record.id).join("|");
  const contextCandidateIds = comparisonCandidates.length ? comparisonCandidates.map((selection) => selection.id) : candidate ? [candidate.id] : [];
  const contextCandidateRecords = uniqueCandidateRecords(contextCandidateIds);
  const contextCandidateRecordIds = contextCandidateRecords.map((record) => record.id).join("|");
  const contextReferenceRecord = reference ? validReference(reference.id) : undefined;
  const contextCandidateRecord = candidate ? getCandidate(candidate.id) ?? contextCandidateRecords[0] : contextCandidateRecords[0];
  const referenceRecord = hasQuerySelection ? (queryHasInvalidId ? undefined : queryReferenceRecord) : contextReferenceRecord;
  const candidateRecord = hasQuerySelection ? queryCandidateRecord : contextCandidateRecord;
  const candidateRecords = hasQuerySelection ? queryCandidateRecords : contextCandidateRecords;
  const ready = Boolean(referenceRecord && candidateRecord) && !queryHasInvalidId;
  const invalidOrIncompleteQuery = hasQuerySelection && (!referenceId || !candidateId || !queryReferenceRecord || !queryCandidateRecord || queryHasInvalidCandidate);
  const queryNoticeTitle = queryHasInvalidId
    ? "INVALID ID IN LINK / NOTHING SUBSTITUTED"
    : candidateRecord && !referenceRecord
    ? "EARTH CANDIDATE RETAINED / REFERENCE REQUIRED"
    : referenceRecord && !candidateRecord
      ? "REFERENCE RETAINED / EARTH CANDIDATE REQUIRED"
      : "COMPARISON LINK NEEDS A VALID PAIR";
  const queryNoticeMessage = queryHasInvalidId
    ? "This comparison link contains an unrecognized Moon or Mars reference or Earth candidate ID. TerraTwin did not substitute another record. Choose valid records in the Explorer or Discovery workspace."
    : candidateRecord && !referenceRecord
    ? `Earth candidate “${candidateRecord.title}” is retained. Select a Moon or Mars reference to complete this comparison.`
    : referenceRecord && !candidateRecord
      ? `${planetNames[referenceRecord.body]} reference “${referenceRecord.title}” is retained. Select an Earth demonstration candidate to complete this comparison.`
      : "No valid pair could be restored from these IDs. Choose a recognized Moon or Mars reference and Earth candidate in the Explorer; unrelated defaults are never substituted.";

  useEffect(() => {
    if (!hasQuerySelection) return;
    if (queryHasInvalidId) {
      setComparisonByIds(null, null);
      return;
    }
    setComparisonByIds(queryReferenceRecord?.id ?? null, queryCandidateRecord?.id ?? null);
    if (queryCandidateRecords.length) setComparisonCandidateIds(queryCandidateRecordIds ? queryCandidateRecordIds.split("|") : []);
  }, [hasQuerySelection, queryCandidateRecord?.id, queryCandidateRecordIds, queryCandidateRecords.length, queryHasInvalidId, queryReferenceRecord?.id, setComparisonByIds, setComparisonCandidateIds]);

  useEffect(() => {
    if (hasQuerySelection || !contextReferenceRecord || !contextCandidateRecord) return;
    navigate(buildComparisonUrl(contextReferenceRecord.id, contextCandidateRecord.id, contextCandidateRecordIds ? contextCandidateRecordIds.split("|") : []), { replace: true });
  }, [contextCandidateRecord?.id, contextCandidateRecordIds, contextReferenceRecord?.id, hasQuerySelection, navigate]);

  function handleClearComparison() {
    clearComparison();
    setSearchParams({}, { replace: true });
  }

  function focusCandidate(id: string) {
    if (!referenceRecord || !candidateRecords.some((site) => site.id === id)) return;
    setActiveCandidateById(id);
    navigate(buildComparisonUrl(referenceRecord.id, id, candidateRecords.map((site) => site.id)));
  }

  function removeFromWorkspace(id: string) {
    removeCandidateById(id);
    const remaining = candidateRecords.filter((item) => item.id !== id);
    navigate(buildComparisonUrl(referenceRecord?.id, remaining.find((item) => item.id === candidateRecord?.id)?.id ?? remaining[0]?.id, remaining.map((item) => item.id)));
  }

  async function copyShareLink() {
    const url = new URL(buildComparisonUrl(referenceRecord?.id, candidateRecord?.id, candidateRecords.map((item) => item.id)), window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setShareText(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // On HTTP/non-secure origins clipboard may be blocked. Give a selectable URL.
      setShareText(url);
      setCopied(false);
    }
  }

  const dimension = comparisonDimensions.find((item) => item.id === activeDimension) ?? comparisonDimensions[0];

  return (
    <main className="compare-page">
      <AppHeader active={referenceRecord?.body} />
      <section className="compare-hero">
        <Link to={referenceRecord ? `/explorer/${referenceRecord.body}` : "/explorer/moon"} className="back-link"><ArrowLeft size={15} /> RETURN TO EXPLORER</Link>
        <div className="compare-hero__heading"><div><p className="eyebrow">CROSS-PLANETARY COMPARISON LAB / 01</p><h1>INSPECT THE <em>ANALOGY.</em></h1></div><StatusBadge status="demonstration" /></div>
        <p className="compare-hero__lede">This lab compares research questions dimension by dimension. It does not calculate an Earth-twin score or turn decorative planetary visuals into scientific evidence.</p>
      </section>
      {invalidOrIncompleteQuery && (
        <section className="comparison-query-notice" role="status">
          <AlertTriangle size={18} />
          <div><strong>{queryNoticeTitle}</strong><p>{queryNoticeMessage}</p></div>
        </section>
      )}
      {ready && referenceRecord && candidateRecord ? (
        <>
          <section className="comparison-bridge" aria-label="Current comparison">
            <article className={`compare-subject compare-subject--${referenceRecord.body}`}><div className="compare-subject__planet"><span /></div><div><span className="eyebrow">REFERENCE / {planetNames[referenceRecord.body]}</span><h2>{referenceRecord.title}</h2><p>{referenceRecord.coordinate.convention}</p></div></article>
            <div className="comparison-bridge__connector"><span>DIMENSIONAL REVIEW</span><MoveRight size={24} /></div>
            <article className="compare-subject compare-subject--earth"><div className="compare-subject__planet"><span /></div><div><span className="eyebrow">CANDIDATE / EARTH</span><h2>{candidateRecord.title}</h2><p>{candidateRecord.region} · {candidateRecord.coordinate.convention}</p></div></article>
          </section>
          <section className="lab-workspace" aria-label="Interactive comparison workspace">
            <div className="lab-workspace__toolbar">
              <div><span className="eyebrow">ACTIVE WORKSPACE / {candidateRecords.length} EARTH RECORD{candidateRecords.length === 1 ? "" : "S"}</span><h2>Investigate the relationship.</h2></div>
              <div className="lab-workspace__tools">
                <div className="lab-segment" aria-label="Comparison view mode">
                  <button type="button" className={workspaceView === "inspect" ? "is-active" : ""} aria-pressed={workspaceView === "inspect"} onClick={() => setWorkspaceView("inspect")}><Layers3 size={15} /> INSPECT</button>
                  <button type="button" className={workspaceView === "matrix" ? "is-active" : ""} aria-pressed={workspaceView === "matrix"} onClick={() => setWorkspaceView("matrix")}><Grid2X2 size={15} /> MATRIX</button>
                </div>
                <button type="button" className="lab-share" onClick={copyShareLink}>{copied ? <Check size={15} /> : <ClipboardCopy size={15} />}{copied ? "LINK COPIED" : "SHARE RESEARCH VIEW"}</button>
              </div>
            </div>
            {shareText && <div className="lab-share-fallback" role="status"><label htmlFor="comparison-share-url">Clipboard access is blocked. Select and copy this link:</label><input id="comparison-share-url" readOnly value={shareText} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={() => setShareText(null)} aria-label="Close share link"><X size={15}/></button></div>}
            <div className="lab-candidate-strip" role="group" aria-label="Choose the active Earth candidate">
              {candidateRecords.map((record: AnalogCandidate, index) => <div className={`lab-candidate ${record.id === candidateRecord.id ? "is-active" : ""}`} key={record.id}>
                <button type="button" onClick={() => focusCandidate(record.id)} aria-pressed={record.id === candidateRecord.id}><span>{String(index + 1).padStart(2, "0")} / {record.discovery.environment}</span><strong>{record.title}</strong><small>{record.region}</small></button>
                <button type="button" className="lab-candidate__remove" title={`Remove ${record.title} from comparison`} aria-label={`Remove ${record.title} from comparison`} onClick={() => removeFromWorkspace(record.id)}><X size={14} /></button>
              </div>)}
              <Link className="lab-candidate lab-candidate--add" to={`/discovery?referenceId=${encodeURIComponent(referenceRecord.id)}`}><span>EXPAND YOUR STUDY</span><strong>+ ADD EARTH SITE</strong><small>Return to discovery</small></Link>
            </div>
            {workspaceView === "inspect" ? <>
              <div className="lab-visual-pair">
                <div className={`lab-visual-card lab-visual-card--${referenceRecord.body}`}><span className="lab-visual-card__label">01 / PLANETARY REFERENCE</span><div className={`lab-visual-card__orb lab-visual-card__orb--${referenceRecord.body}`} aria-hidden="true" /><div className="lab-visual-card__bottom"><span>{planetNames[referenceRecord.body].toUpperCase()} / CURATED REGION</span><h3>{referenceRecord.title}</h3><p>{referenceRecord.description}</p></div></div>
                <div className="lab-visual-pair__separator" aria-hidden="true"><span /> <span>↔</span> <span /></div>
                <div className="lab-visual-card lab-visual-card--earth"><span className="lab-visual-card__label">02 / EARTH STUDY CANDIDATE</span><div className="lab-visual-card__terrain" aria-hidden="true"><i /><i /><i /><i /></div><div className="lab-visual-card__bottom"><span>ILLUSTRATIVE TERRAIN VISUAL / NOT SITE PHOTOGRAPHY</span><h3>{candidateRecord.title}</h3><p>{candidateRecord.region} · {candidateRecord.discovery.environment}</p></div></div>
              </div>
              <div className="lab-dimensions" aria-label="Select an analogy dimension">
                {comparisonDimensions.map((item, index) => <button key={item.id} type="button" aria-pressed={activeDimension === item.id} onClick={() => setActiveDimension(item.id)} className={activeDimension === item.id ? "is-active" : ""}><span>{String(index + 1).padStart(2,"0")}</span><strong>{item.label}</strong><span className="lab-dimensions__indicator" /></button>)}
              </div>
              <div className="lab-inspector" key={dimension.id}>
                <div><span className="eyebrow">DIMENSION INSPECTOR / {dimension.id.toUpperCase()}</span><h3>{dimension.label}</h3><p>{dimension.statement}</p><div className="lab-inspector__callout"><ShieldAlert size={16} /><span>{dimension.caveat}</span></div></div>
                <div className="lab-inspector__evidence"><span className="eyebrow">REVIEWED MEASUREMENT</span><div className="lab-inspector__no-data"><span className="lab-inspector__no-data-grid" /><strong>NO COMPARABLE DATA YET</strong><small>Evidence panel reserved for future verified datasets.</small></div><StatusBadge status={dimension.status} compact /><p>Demonstration rubric state. No numeric similarity or confidence is implied.</p></div>
              </div>
            </> : <div className="lab-matrix-wrap"><div className="lab-matrix-heading"><span className="eyebrow">CANDIDATE MATRIX / CATALOG ONLY</span><p>Compare available demo classifications and suggested research prompts. Blank scientific measurements are deliberately not scored.</p></div><table className="lab-matrix"><caption className="sr-only">Earth candidate demonstration catalog comparison, not a scientific ranking</caption><thead><tr><th scope="col">CATALOG FIELD</th>{candidateRecords.map((site) => <th scope="col" key={site.id}>{site.title}</th>)}</tr></thead><tbody><tr><th scope="row">Region</th>{candidateRecords.map((site) => <td key={site.id}>{site.region}</td>)}</tr><tr><th scope="row">Environment</th>{candidateRecords.map((site) => <td key={site.id}>{site.discovery.environment} <small>DEMO CLASSIFICATION</small></td>)}</tr><tr><th scope="row">Research prompts</th>{candidateRecords.map((site) => <td key={site.id}>{site.discovery.researchDimensions.length ? site.discovery.researchDimensions.join(" · ") : "None listed"}</td>)}</tr><tr><th scope="row">Mission prompts</th>{candidateRecords.map((site) => <td key={site.id}>{site.discovery.missionObjectives.join(" · ")}</td>)}</tr><tr><th scope="row">Verified site measurements</th>{candidateRecords.map((site) => <td key={site.id}><span className="lab-matrix__unavailable">NOT CONNECTED</span></td>)}</tr></tbody></table></div>}
            <p className="lab-workspace__disclosure"><FlaskConical size={15} /> These visuals, classifications and dimension statuses describe a frontend demonstration, not a site-specific NASA assessment or calculated planetary similarity.</p>
          </section>
          <section className="comparison-status-callout"><FlaskConical size={19} /><div><strong>DEMONSTRATION RUBRIC — NOT A SITE-SPECIFIC SCIENTIFIC ASSESSMENT.</strong><p>The six centralized statements below demonstrate evidence-aware interface states. They are not measurements, pair-specific conclusions, NASA findings, or a validated analog ranking.</p></div></section>
          <section className="comparison-status-summary">
            <div className="comparison-status-summary__copy"><span className="eyebrow">DEMONSTRATION RUBRIC / SIX DIMENSIONS</span><h2>Visible uncertainty<br />is part of the result.</h2><p>Counts show the current status labels assigned to the six general rubric questions. They are not measurements, evidence strength, or a match score.</p></div>
            <div className="comparison-status-summary__chart" role="img" aria-label="Evidence status count chart: two hypotheses, two missing information, one demonstration, and one not comparable. These are demonstration-rubric label counts, not a similarity score.">
              <span className="comparison-status-summary__caption">STATUS COUNTS / NOT A MATCH SCORE</span>
              <ResponsiveContainer width="100%" height={128}>
                <BarChart data={statusCountData} layout="vertical" margin={{ top: 2, right: 18, bottom: 0, left: 0 }}>
                  <XAxis type="number" allowDecimals={false} domain={[0, "dataMax"]} tick={{ fill: "#7f95a4", fontSize: 10 }} axisLine={{ stroke: "#2a3b4d" }} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={105} tick={{ fill: "#b9c5ce", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(70,199,217,.06)" }} contentStyle={{ backgroundColor: "#0b1420", border: "1px solid #2a3b4d", borderRadius: 0, color: "#f2f5f7" }} labelStyle={{ color: "#46c7d9", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }} formatter={(value) => [`${value} dimension${value === 1 ? "" : "s"}`, "Status count"]} />
                  <Bar dataKey="count" maxBarSize={12} radius={[0, 3, 3, 0]}>{statusCountData.map((item) => <Cell key={item.key} fill={statusChartPalette[item.key]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              <ul className="sr-only">{statusCountData.map((item) => <li key={item.key}>{item.count} dimensions marked {item.label}</li>)}</ul>
            </div>
          </section>
          <section className="dimension-grid">{comparisonDimensions.map((dimension, index) => <article className="dimension-card" key={dimension.id}><div className="dimension-card__meta"><span>{String(index + 1).padStart(2, "0")}</span><StatusBadge status={dimension.status} compact /></div><h3>{dimension.label}</h3><span className="dimension-card__rubric">DEMONSTRATION RUBRIC — NOT A SITE-SPECIFIC SCIENTIFIC ASSESSMENT.</span><p>{dimension.statement}</p><div className="dimension-card__caveat"><ShieldAlert size={14} /><span>{dimension.caveat}</span></div></article>)}</section>
          <section className="comparison-conclusion"><div><span className="eyebrow">INTERPRETATION BOUNDARY</span><h2>There is no universal analog.</h2></div><p>TerraTwin preserves the research context that selected this pair, but similarity must be evaluated using reviewed variables, compatible units, source coverage, and a transparent method. This prototype intentionally leaves unsupported dimensions unresolved.</p></section>
          <section className="comparison-actions"><Link to={`/sites/${candidateRecord.id}?referenceId=${encodeURIComponent(referenceRecord.id)}`} className="mission-button mission-button--secondary"><MapPin size={15} /> OPEN SITE DOSSIER</Link><button type="button" onClick={() => navigate(`/explorer/${referenceRecord.body}`)} className="mission-button mission-button--secondary">ADJUST REFERENCE <ArrowUpRight size={15} /></button><button type="button" onClick={handleClearComparison} className="clear-comparison"><RotateCcw size={15} /> CLEAR CURRENT SELECTION</button></section>
        </>
      ) : (
        <section className="comparison-empty">
          <div className="comparison-empty__diagram"><span className="comparison-empty__body comparison-empty__body--moon" /><i /><span className="comparison-empty__body comparison-empty__body--earth" /></div>
          <p className="eyebrow">COMPARISON NOT YET SCOPED</p><h2>Choose a planetary reference and an Earth candidate.</h2><p>Begin in a Moon or Mars explorer, select a reference, then open Earth and select one of the clearly labeled demonstration candidates. Direct links restore only validated IDs.</p>
          {(referenceRecord || candidateRecord) && <div className="comparison-partial-selection"><span>SELECTION RETAINED / A PAIR IS STILL REQUIRED</span>{referenceRecord && <p>REFERENCE / {planetNames[referenceRecord.body]} · {referenceRecord.title}</p>}{candidateRecord && <p>EARTH CANDIDATE · {candidateRecord.title} · {candidateRecord.region}</p>}</div>}
          <div><button type="button" className="mission-button mission-button--primary" onClick={() => navigate("/explorer/moon")}>OPEN MOON EXPLORER <ArrowUpRight size={15} /></button><button type="button" className="mission-button mission-button--secondary" onClick={() => navigate("/discovery")}>OPEN GLOBAL DISCOVERY <ArrowUpRight size={15} /></button></div>
          {candidates.length > 0 && <small>All available Earth candidate records are demonstration content.</small>}
        </section>
      )}
    </main>
  );
}
