import { useExplorer } from "@/app/ExplorerContext";
import { AppHeader, StatusBadge } from "@/components/terratwin/AppChrome";
import PlanetFallback from "@/components/terratwin/PlanetFallback";
import { candidates, getFeature } from "@/data/mockData";
import type { AnalogCandidate, DiscoveryEnvironment, DiscoveryFilterState, MissionObjective } from "@/domain/terratwin";
import CandidateCard from "@/features/discovery/CandidateCard";
import DiscoveryFilters from "@/features/discovery/DiscoveryFilters";
import DiscoveryTray from "@/features/discovery/DiscoveryTray";
import { Crosshair, List, Map as MapIcon, Minus, Plus, SearchX, SlidersHorizontal, Sparkles, Mountain, MountainSnow, Sun, Truck } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { filterDiscoveryCandidates, type DiscoverySortMode } from "@/features/discovery/filterCandidates";

const EarthCesiumViewer = lazy(() => import("@/features/explorer/earth-cesium/EarthCesiumViewer"));
type ViewMode = DiscoveryFilterState["view"];

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

const discoveryPresets: Array<{ title: string; label: string; environment?: DiscoveryEnvironment; objective?: MissionObjective; Icon: typeof Sun }> = [
  { title: "ARID LANDSCAPES", label: "DRY TERRAIN", environment: "Arid", Icon: Sun },
  { title: "VOLCANIC FIELDS", label: "SURFACE MATERIALS", environment: "Volcanic", Icon: Mountain },
  { title: "POLAR RESEARCH", label: "COLD REGIONS", environment: "Polar", Icon: MountainSnow },
  { title: "ROVER OPERATIONS", label: "MOBILITY TESTING", objective: "Rover Testing", Icon: Truck },
];

export default function DiscoveryPage() {
  const [searchParams] = useSearchParams();
  const { reference, candidate, comparisonCandidates, discoveryFilters, setDiscoveryFilters, setReferenceById, setActiveCandidateById, addCandidateById, removeCandidateById, clearCandidateSelections, cameraAction, sendCameraAction } = useExplorer();
  const { targetPlanet, environments, objectives, dimensions, search, sort, view } = discoveryFilters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(candidate?.id ?? candidates[0]?.id ?? null);
  const requestedReferenceId = searchParams.get("referenceId");

  useEffect(() => {
    const requestedReference = requestedReferenceId ? getFeature(requestedReferenceId) : undefined;
    if (requestedReference && (requestedReference.body === "moon" || requestedReference.body === "mars")) {
      const requestedBody = requestedReference.body;
      if (reference?.id !== requestedReference.id) setReferenceById(requestedReference.id);
      setDiscoveryFilters((current) => current.initialized ? current : { ...current, initialized: true, targetPlanet: requestedBody });
      return;
    }
    if (!discoveryFilters.initialized) {
      const initialTarget = reference?.body === "moon" || reference?.body === "mars" ? reference.body : null;
      setDiscoveryFilters((current) => current.initialized ? current : { ...current, initialized: true, targetPlanet: current.targetPlanet ?? initialTarget });
    }
  }, [discoveryFilters.initialized, reference?.body, reference?.id, requestedReferenceId, setDiscoveryFilters, setReferenceById]);

  const filteredCandidates = useMemo(() => filterDiscoveryCandidates(candidates, discoveryFilters, sort), [discoveryFilters, sort]);
  const visibleCandidateIds = useMemo(() => filteredCandidates.map((site) => site.id), [filteredCandidates]);
  const selectedIds = useMemo(() => comparisonCandidates.map((item) => item.id), [comparisonCandidates]);

  useEffect(() => {
    const preserved = candidate?.id && filteredCandidates.some((site) => site.id === candidate.id) ? candidate.id : null;
    setSelectedCandidateId((current) => preserved ?? (current && filteredCandidates.some((site) => site.id === current) ? current : filteredCandidates[0]?.id ?? null));
  }, [candidate?.id, filteredCandidates]);

  const selectedCandidate = filteredCandidates.find((site) => site.id === selectedCandidateId) ?? null;

  function selectCandidate(site: AnalogCandidate) {
    setSelectedCandidateId(site.id);
    setActiveCandidateById(site.id);
  }

  function addCandidate(site: AnalogCandidate) {
    setSelectedCandidateId(site.id);
    addCandidateById(site.id);
  }

  function clearFilters() {
    setDiscoveryFilters((current) => ({ ...current, initialized: true, targetPlanet: null, environments: [], objectives: [], dimensions: [], search: "", sort: "name" }));
  }

  function updateFilters(patch: Partial<DiscoveryFilterState>) {
    setDiscoveryFilters((current) => ({ ...current, ...patch, initialized: true }));
  }

  return (
    <main className={`discovery-page discovery-page--${view}`}>
      <AppHeader active="earth" />
      <header className="discovery-header">
        <div>
          <p className="eyebrow">TERRESTRIAL REFERENCE WORKSPACE / 03</p>
          <h1>GLOBAL ANALOG <em>DISCOVERY</em></h1>
          <p>Explore terrestrial environments that may provide useful analogues for lunar and Martian exploration.</p>
        </div>
        <div className="discovery-header__telemetry" aria-label="Current discovery context">
          <div><span>REFERENCE PLANET</span><strong>{reference ? reference.body.toUpperCase() : "UNSET"}</strong></div>
          <div><span>SELECTED REGION</span><strong>{reference?.title ?? "SELECT IN EXPLORER"}</strong></div>
          <div><span>RESEARCH DIMENSIONS</span><strong>{dimensions.length ? `${dimensions.length} FILTERED` : "ALL DEMO PROMPTS"}</strong></div>
          <StatusBadge status="demonstration" compact />
        </div>
        {reference && targetPlanet && targetPlanet !== reference.body && <p className="discovery-context-mismatch">The {targetPlanet.toUpperCase()} target filter differs from the preserved {reference.body.toUpperCase()} reference. The reference selection is unchanged.</p>}
      </header>

      <section className="discovery-presets" aria-label="Quick discovery filters"><div className="discovery-presets__intro"><Sparkles size={16} /><div><span className="eyebrow">QUICK SCAN / DISCOVERY PRESETS</span><small>Explore the demonstration catalog by environment or mission purpose.</small></div></div><div className="discovery-presets__list">{discoveryPresets.map(({ title, label, environment, objective, Icon }) => {
        const active = Boolean(environment ? environments.length === 1 && environments[0] === environment && objectives.length === 0 : objectives.length === 1 && objectives[0] === objective && environments.length === 0);
        return <button type="button" key={title} aria-pressed={active} className={active ? "is-active" : ""} onClick={() => updateFilters({ environments: active || !environment ? [] : [environment], objectives: active || !objective ? [] : [objective], dimensions: [], search: "" })}><Icon size={18} /><span><strong>{title}</strong><small>{label}</small></span></button>;
      })}</div></section>
      <section className="discovery-workspace">
        <DiscoveryFilters
          targetPlanet={targetPlanet}
          environments={environments}
          objectives={objectives}
          dimensions={dimensions}
          search={search}
          sort={sort}
          resultCount={filteredCandidates.length}
          mobileOpen={filtersOpen}
          onToggleMobile={() => setFiltersOpen((open) => !open)}
          onTargetPlanet={(value) => updateFilters({ targetPlanet: value })}
          onToggleEnvironment={(value) => updateFilters({ environments: toggleValue(environments, value) })}
          onToggleObjective={(value) => updateFilters({ objectives: toggleValue(objectives, value) })}
          onToggleDimension={(value) => updateFilters({ dimensions: toggleValue(dimensions, value) })}
          onSearch={(value) => updateFilters({ search: value })}
          onSort={(value) => updateFilters({ sort: value })}
          onClear={clearFilters}
        />

        <section className="discovery-viewport" aria-label={view === "map" ? "Discovery map" : "Discovery candidate list"}>
          <div className="discovery-viewport__toolbar">
            <div><span className="panel-label">{view === "map" ? "GEOGRAPHIC ORIENTATION" : "FIELD INDEX"}</span><strong>{filteredCandidates.length} DEMONSTRATION CANDIDATE{filteredCandidates.length === 1 ? "" : "S"}</strong></div>
            <div className="discovery-view-toggle" aria-label="Discovery view">
              <button type="button" className={view === "map" ? "is-active" : ""} onClick={() => updateFilters({ view: "map" })} aria-pressed={view === "map"}><MapIcon size={15} /> MAP</button>
              <button type="button" className={view === "list" ? "is-active" : ""} onClick={() => updateFilters({ view: "list" })} aria-pressed={view === "list"}><List size={15} /> LIST</button>
            </div>
          </div>
          {view === "map" ? (
            <div className="discovery-map-shell">
              <Suspense fallback={<PlanetFallback body="earth" loading />}>
                <EarthCesiumViewer
                  selectedCandidateId={selectedCandidateId}
                  onSelectCandidate={(id) => {
                    const site = candidates.find((candidateRecord) => candidateRecord.id === id);
                    if (site) selectCandidate(site);
                  }}
                  cameraAction={cameraAction}
                  showCandidates
                  visualLayerEnabled
                  visibleCandidateIds={visibleCandidateIds}
                />
              </Suspense>
              <div className="discovery-map-shell__badge"><span className="live-pip" /> DEMONSTRATION MAP / ILLUSTRATIVE PLACEMENTS</div>
              <div className="discovery-map-shell__controls" aria-label="Map navigation controls"><button type="button" onClick={() => sendCameraAction("zoom-in")} aria-label="Zoom map in"><Plus size={16} /></button><button type="button" onClick={() => sendCameraAction("zoom-out")} aria-label="Zoom map out"><Minus size={16} /></button><button type="button" onClick={() => sendCameraAction("home")} aria-label="Reset map"><Crosshair size={15} /></button></div>
              {selectedCandidate && <div className="discovery-map-shell__selection"><span>SELECTED DEMONSTRATION RECORD</span><strong>{selectedCandidate.title}</strong><p>{selectedCandidate.region} · {selectedCandidate.discovery.environment}</p></div>}
              {!filteredCandidates.length && <div className="discovery-empty discovery-empty--map"><SearchX size={22} /><strong>No candidate records meet this query.</strong><p>Change filters or clear the current discovery constraints. No records are hidden as scientific results.</p></div>}
            </div>
          ) : (
            <div className="discovery-list-view">
              {filteredCandidates.length ? filteredCandidates.map((site) => <CandidateCard key={site.id} candidate={site} referenceId={reference?.id} selected={site.id === selectedCandidateId} added={selectedIds.includes(site.id)} onSelect={selectCandidate} onAdd={addCandidate} onRemove={(candidateRecord) => removeCandidateById(candidateRecord.id)} />) : <div className="discovery-empty"><SearchX size={22} /><strong>No candidate records meet this query.</strong><p>Clear one or more filters to restore the demonstration field index.</p></div>}
            </div>
          )}
        </section>

        <aside className={`discovery-context-panel instrument-panel ${contextOpen ? "is-mobile-open" : ""}`} aria-label="Candidate results and selected context">
          <button type="button" className="discovery-context-panel__mobile-toggle" aria-expanded={contextOpen} onClick={() => setContextOpen((open) => !open)}><span>CANDIDATE RESULTS / {filteredCandidates.length.toString().padStart(2, "0")} · {selectedCandidate?.title ?? "NO SITE SELECTED"}</span><SlidersHorizontal size={15} /></button>
          <div className="discovery-context-panel__head"><div><span className="eyebrow">CANDIDATE RESULTS / {filteredCandidates.length.toString().padStart(2, "0")}</span><h2>Selected <em>site.</em></h2></div><SlidersHorizontal size={16} /></div>
          {filteredCandidates.length > 0 && <div className="discovery-context-panel__index" role="listbox" aria-label="Candidate result selection">{filteredCandidates.map((site) => <button type="button" role="option" aria-selected={site.id === selectedCandidateId} className={site.id === selectedCandidateId ? "is-selected" : ""} key={site.id} onClick={() => selectCandidate(site)}><span><strong>{site.title}</strong><small>{site.region} · {site.discovery.environment}</small></span><span className="discovery-context-panel__pin">{site.id === selectedCandidateId ? "SELECTED" : "DEMO"}</span></button>)}</div>}
          {selectedCandidate ? <CandidateCard candidate={selectedCandidate} referenceId={reference?.id} selected added={selectedIds.includes(selectedCandidate.id)} onSelect={selectCandidate} onAdd={addCandidate} onRemove={(candidateRecord) => removeCandidateById(candidateRecord.id)} /> : <div className="discovery-empty"><SearchX size={22} /><strong>No selected candidate</strong><p>Select a marker or a candidate card after widening the current filter query.</p></div>}
        </aside>
      </section>
      <DiscoveryTray reference={reference} candidates={comparisonCandidates} onRemove={removeCandidateById} onClear={clearCandidateSelections} />
    </main>
  );
}
