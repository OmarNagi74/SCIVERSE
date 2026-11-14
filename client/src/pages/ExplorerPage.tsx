import { buildComparisonUrl } from "@/app/comparisonUrl";
import { useExplorer } from "@/app/ExplorerContext";
import { AppHeader, ComparisonTray, ExplorerTelemetry, StatusBadge } from "@/components/terratwin/AppChrome";
import PlanetFallback from "@/components/terratwin/PlanetFallback";
import VisualSources from "@/components/terratwin/VisualSources";
import { candidates, getFeaturesForBody, getLayersForBody, planetIntro } from "@/data/catalog";
import type { AnalogCandidate, PlanetFeature, PlanetId } from "@/domain/terratwin";
import { planetNames } from "@/domain/terratwin";
import {
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  Compass,
  Crosshair,
  Expand,
  Layers3,
  LocateFixed,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const EarthCesiumViewer = lazy(() => import("@/features/explorer/earth-cesium/EarthCesiumViewer"));
const PlanetScene = lazy(() => import("@/features/explorer/planet-r3f/PlanetScene"));

const MOON_TEXTURE_MIN_LATITUDE = -79;
const MOON_TEXTURE_MAX_LATITUDE = 79;

type ExplorerPageProps = { body: PlanetId };
type SearchItem = PlanetFeature | AnalogCandidate;

function isCandidate(item: SearchItem): item is AnalogCandidate {
  return item.body === "earth" && "region" in item;
}

function itemLocation(item: SearchItem) {
  return `${Math.abs(item.coordinate.latitude).toFixed(1)}°${item.coordinate.latitude < 0 ? "S" : "N"} / ${Math.abs(item.coordinate.longitude).toFixed(1)}°${item.coordinate.longitude < 0 ? "W" : "E"}`;
}

export default function ExplorerPage({ body }: ExplorerPageProps) {
  const navigate = useNavigate();
  const { setCandidateById, setReferenceFeature, candidate, reference, cameraAction, sendCameraAction } = useExplorer();
  const currentFeatures = useMemo(() => getFeaturesForBody(body), [body]);
  const currentLayers = useMemo(() => getLayersForBody(body), [body]);
  const searchItems = body === "earth" ? candidates : currentFeatures;
  const [selectedId, setSelectedId] = useState<string | null>(searchItems[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [leftOpen, setLeftOpen] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 780px)").matches);
  const [rightOpen, setRightOpen] = useState(() => typeof window === "undefined" || !window.matchMedia("(max-width: 780px)").matches);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({});
  const [departing, setDeparting] = useState(false);
  const departureTimer = useRef<number | null>(null);
  useEffect(() => () => { if (departureTimer.current !== null) window.clearTimeout(departureTimer.current); }, []);
  // A narrow viewport uses mutually exclusive instrument drawers so the
  // expensive 3D canvas is never obscured by two overlapping panels.
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 780px)");
    const sync = (event: MediaQueryListEvent) => {
      setLeftOpen(!event.matches);
      setRightOpen(!event.matches);
    };
    mobile.addEventListener("change", sync);
    return () => mobile.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const closeDrawers = (event: KeyboardEvent) => {
      if (event.key === "Escape" && window.matchMedia("(max-width: 780px)").matches) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("keydown", closeDrawers);
    return () => window.removeEventListener("keydown", closeDrawers);
  }, []);
  const mobileViewport = () => window.matchMedia("(max-width: 780px)").matches;
  function toggleControls() {
    setLeftOpen((open) => !open);
    if (mobileViewport()) setRightOpen(false);
  }
  function toggleDetails() {
    setRightOpen((open) => !open);
    if (mobileViewport()) setLeftOpen(false);
  }

  function journeyToDiscovery(feature: PlanetFeature) {
    setReferenceFeature(feature);
    const destination = `/discovery?referenceId=${encodeURIComponent(feature.id)}`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(destination);
      return;
    }
    setDeparting(true);
    if (departureTimer.current !== null) window.clearTimeout(departureTimer.current);
    departureTimer.current = window.setTimeout(() => navigate(destination), 620);
  }

  useEffect(() => {
    const preservedCandidate = body === "earth" && candidate && candidates.some((site) => site.id === candidate.id) ? candidate.id : null;
    const preservedReference = body !== "earth" && reference?.body === body && currentFeatures.some((feature) => feature.id === reference.id) ? reference.id : null;
    setSelectedId(preservedCandidate ?? preservedReference ?? (body === "earth" ? candidates[0]?.id ?? null : currentFeatures[0]?.id ?? null));
  }, [body, currentFeatures]);

  useEffect(() => {
    setQuery("");
    const defaults = Object.fromEntries(getLayersForBody(body).filter((layer) => layer.available).map((layer) => [layer.id, true]));
    setActiveLayers(defaults);
  }, [body]);

  const selected = searchItems.find((item) => item.id === selectedId) ?? null;
  const filteredItems = searchItems.filter((item) => `${item.title} ${"region" in item ? item.region : item.kind}`.toLowerCase().includes(query.trim().toLowerCase()));
  const visualLayer = currentLayers.find((layer) => layer.kind === "visual");
  const candidateLayer = currentLayers.find((layer) => layer.id === "earth-candidates");
  const activeLayerCount = Object.values(activeLayers).filter(Boolean).length;

  useEffect(() => {
    if (body === "earth" && selected && isCandidate(selected)) setCandidateById(selected.id);
  }, [body, selectedId, setCandidateById]);

  function selectItem(item: SearchItem) {
    setSelectedId(item.id);
    if (isCandidate(item)) setCandidateById(item.id);
    if (mobileViewport()) { setLeftOpen(false); setRightOpen(true); }
  }

  function selectAdjacent(step: -1 | 1) {
    if (!searchItems.length) return;
    const currentIndex = Math.max(0, searchItems.findIndex((item) => item.id === selectedId));
    const nextIndex = (currentIndex + step + searchItems.length) % searchItems.length;
    selectItem(searchItems[nextIndex]);
  }

  function openComparison(candidateRecord: AnalogCandidate) {
    setCandidateById(candidateRecord.id);
    navigate(buildComparisonUrl(reference?.id ?? null, candidateRecord.id));
  }

  function toggleLayer(id: string) {
    setActiveLayers((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <main className={`explorer-page explorer-page--${body}`}>
      <AppHeader active={body} />
      <section className="explorer-workspace">
        <aside className={`explorer-left-panel instrument-panel ${leftOpen ? "is-open" : "is-closed"}`} aria-label="Explorer controls">
          <button type="button" className="panel-edge-toggle panel-edge-toggle--left" onClick={toggleControls} aria-expanded={leftOpen} aria-label={leftOpen ? "Collapse exploration controls" : "Open exploration controls"}>
            {leftOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          <div className="panel-scroll">
            <div className="panel-section panel-section--search">
              <label className="panel-label" htmlFor="feature-search">SEARCH {body === "earth" ? "CANDIDATES" : "FEATURES"}</label>
              <div className="search-input"><Search size={15} /><input id="feature-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={body === "earth" ? "Search demo sites" : `Search ${planetNames[body]}`} /></div>
            </div>
            <div className="panel-section">
              <div className="panel-section__heading"><span className="panel-label">FEATURE INDEX</span><span>{filteredItems.length.toString().padStart(2, "0")}</span></div>
              <div className="feature-list">
                {filteredItems.map((item) => (
                  <button type="button" className={`feature-row ${item.id === selectedId ? "is-selected" : ""}`} onClick={() => selectItem(item)} key={item.id}>
                    <span className="feature-row__signal" />
                    <span><strong>{item.title}</strong><small>{isCandidate(item) ? item.region : item.kind}</small></span>
                    <ChevronRight size={14} />
                  </button>
                ))}
                {!filteredItems.length && <p className="empty-search">No indexed records match this search.</p>}
              </div>
            </div>
            <div className="panel-section layer-section">
              <div className="panel-section__heading"><span className="panel-label">LAYER STACK</span><Layers3 size={14} /></div>
              {currentLayers.map((layer) => (
                <label className={`layer-row ${!layer.available ? "is-unavailable" : ""}`} key={layer.id} title={layer.description}>
                  <input type="checkbox" checked={Boolean(activeLayers[layer.id])} disabled={!layer.available} onChange={() => toggleLayer(layer.id)} />
                  <span className="layer-row__checkbox" aria-hidden="true" />
                  <span><strong>{layer.label}</strong><small>{layer.kind === "analytical" ? "NO ACTIVE DATASET" : layer.kind.toUpperCase()}</small></span>
                  <i className={`layer-type layer-type--${layer.kind}`} />
                </label>
              ))}
            </div>
            <div className="panel-section nav-tools">
              <span className="panel-label">NAVIGATION</span>
              <div>
                <button type="button" onClick={() => sendCameraAction("zoom-in")} aria-label="Zoom in"><Plus size={16} /></button>
                <button type="button" onClick={() => sendCameraAction("zoom-out")} aria-label="Zoom out"><Minus size={16} /></button>
                <button type="button" onClick={() => sendCameraAction("home")} aria-label="Reset camera"><LocateFixed size={16} /></button>
              </div>
            </div>
          </div>
        </aside>

        <section className="explorer-aperture">
          <div className="mobile-explorer-nav" role="group" aria-label="Mobile exploration panels">
            <button type="button" className={leftOpen ? "is-active" : ""} aria-pressed={leftOpen} onClick={toggleControls}><PanelLeft size={15} /> CONTROLS</button>
            <button type="button" className={rightOpen ? "is-active" : ""} aria-pressed={rightOpen} onClick={toggleDetails}><PanelRight size={15} /> DETAILS</button>
          </div>
          <div className="aperture-header">
            <div><p className="eyebrow">{planetIntro[body].eyebrow}</p><h1>{planetIntro[body].title}</h1></div>
            <div className="aperture-header__status"><span className="live-pip" /> EXPLORER ONLINE</div>
          </div>
          <div className="aperture-corner aperture-corner--tl" /><div className="aperture-corner aperture-corner--tr" /><div className="aperture-corner aperture-corner--bl" /><div className="aperture-corner aperture-corner--br" />
          <div className="view-toolbar" aria-label="Planet navigation controls">
            <button type="button" onClick={() => sendCameraAction("zoom-in")} aria-label="Zoom in"><Plus size={17} /></button>
            <button type="button" onClick={() => sendCameraAction("zoom-out")} aria-label="Zoom out"><Minus size={17} /></button>
            <button type="button" onClick={() => sendCameraAction("home")} aria-label="Home camera"><Crosshair size={16} /></button>
            <span />
            <button type="button" onClick={() => setLeftOpen(false)} aria-label="Maximize visual field"><Expand size={16} /></button>
          </div>
          <div className="planet-viewer-frame">
            <Suspense fallback={<PlanetFallback body={body} loading />}>
              {body === "earth" ? (
                <EarthCesiumViewer
                  selectedCandidateId={selectedId}
                  onSelectCandidate={(id) => {
                    const site = candidates.find((candidateRecord) => candidateRecord.id === id);
                    if (site) selectItem(site);
                  }}
                  cameraAction={cameraAction}
                  showCandidates={Boolean(activeLayers[candidateLayer?.id ?? ""])}
                  visualLayerEnabled={Boolean(activeLayers[visualLayer?.id ?? ""])}
                />
              ) : (
                <PlanetScene
                  body={body}
                  selectedFeatureId={selectedId}
                  onSelectFeature={setSelectedId}
                  cameraAction={cameraAction}
                  visualLayerEnabled={Boolean(activeLayers[visualLayer?.id ?? ""])}
                  showFeatures={Boolean(activeLayers[`${body}-features`])}
                />
              )}
            </Suspense>
          </div>
          {selected && <div className="aperture-target" aria-live="polite" key={selected.id}>
            <span className="aperture-target__marker"><Crosshair size={15} /></span>
            <div className="aperture-target__readout"><span>SELECTED {body === "earth" ? "EARTH CANDIDATE" : "PLANETARY REGION"} / VISUAL CONTEXT</span><strong>{selected.title}</strong><small>{itemLocation(selected)} · {body.toUpperCase()}</small></div>
            {body !== "earth" && <div className="aperture-target__sequence" role="group" aria-label="Cycle planetary references">
              <button type="button" onClick={() => selectAdjacent(-1)} aria-label="Previous planetary region" title="Previous region"><ChevronLeft size={15} /></button>
              <span>{String(Math.max(0, currentFeatures.findIndex((feature) => feature.id === selectedId)) + 1).padStart(2, "0")} / {String(currentFeatures.length).padStart(2, "0")}</span>
              <button type="button" onClick={() => selectAdjacent(1)} aria-label="Next planetary region" title="Next region"><ChevronRight size={15} /></button>
            </div>}
          </div>}
          <div className="aperture-caption"><Compass size={14} /><span>{planetIntro[body].visualLabel}</span></div>
          <div className="aperture-scale"><span>0°</span><i /><span>90°</span><i /><span>180°</span></div>
        </section>

        <aside className={`explorer-right-panel instrument-panel ${rightOpen ? "is-open" : "is-closed"}`} aria-label="Selected feature information">
          <button type="button" className="panel-edge-toggle panel-edge-toggle--right" onClick={toggleDetails} aria-expanded={rightOpen} aria-label={rightOpen ? "Collapse selected feature details" : "Open selected feature details"}>
            {rightOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <div className="panel-scroll">
            <div className="selected-panel__top"><span className="eyebrow">SELECTED {body === "earth" ? "CANDIDATE" : "REFERENCE"}</span><SlidersHorizontal size={16} /></div>
            {selected ? <SelectedDetails selected={selected} body={body} onSetReference={() => {
              if (!isCandidate(selected)) setReferenceFeature(selected);
            }} onOpenDiscovery={journeyToDiscovery} onOpenLab={openComparison} /> : <p className="empty-search">Choose a feature to inspect its research context.</p>}
            {body === "moon" && selected && <LunarCoverageNotice latitude={selected.coordinate.latitude} />}
            <div className="evidence-mini">
              <div><span className="eyebrow">AVAILABLE EVIDENCE</span><span className="evidence-mini__line" /></div>
              <p>Records are loaded from the backend dataset. Inspect source coverage and uncertainty before using results as scientific evidence.</p>
              <button type="button" onClick={() => navigate("/mission#method")}>READ METHOD NOTES <ChevronRight size={14} /></button>
            </div>
            <VisualSources />
            <div className="next-action-card">
              <span className="eyebrow">NEXT ACTION</span>
              <strong>{reference ? "Choose / verify Earth candidate" : "Set a planetary reference"}</strong>
              <p>{candidate ? "A dataset candidate is ready in the comparison tray." : "A complete comparison needs both a reference and an Earth candidate."}</p>
            </div>
          </div>
        </aside>
      </section>
      <ComparisonTray />
      <ExplorerTelemetry body={body} activeLayerCount={activeLayerCount} />
      {departing && <div className="planet-departure" role="status"><div className="planet-departure__ring"><Compass size={25} /></div><span>REFERENCE SELECTED / {body.toUpperCase()}</span><strong>ENTERING EARTH DISCOVERY</strong><small>Opening terrestrial study workspace</small><div className="planet-departure__progress"><span /></div></div>}
    </main>
  );
}

function LunarCoverageNotice({ latitude }: { latitude: number }) {
  const outsideCoverage = latitude < MOON_TEXTURE_MIN_LATITUDE || latitude > MOON_TEXTURE_MAX_LATITUDE;
  return (
    <section className="lunar-coverage-notice" aria-label="Lunar texture coverage limitation">
      <span className="eyebrow">LUNAR TEXTURE COVERAGE</span>
      <strong>USGS GLD100 preview: 79°S–79°N</strong>
      <p>The GLD100-derived preview covers equatorial and mid-latitude terrain only. Polar caps show a gridded no-data treatment, not surface detail; no source imagery or elevation is available beyond 79°N–79°S.</p>
      {outsideCoverage && <p className="lunar-coverage-notice__selected">SELECTED REFERENCE AT {Math.abs(latitude).toFixed(1)}°{latitude < 0 ? "S" : "N"} IS OUTSIDE TEXTURE COVERAGE.</p>}
    </section>
  );
}

function SelectedDetails({ selected, body, onSetReference, onOpenDiscovery, onOpenLab }: { selected: SearchItem; body: PlanetId; onSetReference: () => void; onOpenDiscovery: (feature: PlanetFeature) => void; onOpenLab: (candidate: AnalogCandidate) => void }) {
  const candidateRecord = isCandidate(selected);
  return (
    <div className="selected-details">
      <StatusBadge status={selected.status} />
      <h2>{selected.title}</h2>
      <p className="selected-details__kind">{candidateRecord ? selected.region : selected.kind}</p>
      <div className="coordinate-readout"><span>COORDINATES</span><strong>{itemLocation(selected)}</strong><small>{selected.coordinate.convention}</small></div>
      <p>{selected.description}</p>
      <div className="context-callout"><span>CONTEXT</span><p>{candidateRecord ? selected.notice : selected.context}</p></div>
      <div className="source-strip"><span>SOURCE STATUS</span><strong>{selected.sourceLabel}</strong></div>
      {candidateRecord ? (
        <button type="button" className="mission-button mission-button--primary selected-action" onClick={() => onOpenLab(selected)}>OPEN COMPARISON LAB <ChevronRight size={15} /></button>
      ) : (
        <div className="selected-details__reference-actions"><button type="button" className="mission-button mission-button--primary selected-action" onClick={onSetReference}>SET AS REFERENCE <ChevronRight size={15} /></button><button type="button" className="mission-button mission-button--secondary selected-action" onClick={() => onOpenDiscovery(selected)}>DISCOVER EARTH ANALOGS <ChevronRight size={15} /></button></div>
      )}
      {body === "earth" && <p className="panel-footnote">Selecting a site synchronizes this dataset candidate with the comparison tray.</p>}
    </div>
  );
}
