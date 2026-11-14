import { buildComparisonUrl } from "@/app/comparisonUrl";
import { useExplorer } from "@/app/ExplorerContext";
import { statusCopy, type DataStatus, type PlanetId, planetCodes, planetNames } from "@/domain/terratwin";
import {
  ArrowUpRight,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  CircleDot,
  FlaskConical,
  Layers3,
  Menu,
  Orbit,
  Radar,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GuidedJourney from "./GuidedJourney";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Mission", to: "/mission" },
  { label: "Explore", to: "/explorer/moon" },
  { label: "Discover", to: "/discovery" },
  { label: "Compare", to: "/compare" },
  { label: "Science", to: "/mission#method" },
];

const statusIcon = {
  demonstration: FlaskConical,
  verified: CircleDot,
  hypothesis: Sparkles,
  missing: X,
  "not-comparable": Orbit,
};

export function SciVerseGlyph({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`tt-glyph ${compact ? "tt-glyph--compact" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export function StatusBadge({ status, compact = false }: { status: DataStatus; compact?: boolean }) {
  const Icon = statusIcon[status];
  return (
    <span className={`status-badge status-badge--${status} ${compact ? "status-badge--compact" : ""}`}>
      <Icon size={compact ? 11 : 13} strokeWidth={1.9} />
      <span>{compact ? statusCopy[status].replace("DEMO — ", "") : statusCopy[status]}</span>
    </span>
  );
}

/** A short inter-planet jump, not a full-screen loading gate or a data claim. */
export function PlanetSwitcher({ active }: { active?: PlanetId }) {
  const navigate = useNavigate();
  const current = active ?? "earth";
  const [destination, setDestination] = useState<PlanetId | null>(null);
  const timer = useRef<number | null>(null);
  const clearTimer = () => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => clearTimer(), []);
  useEffect(() => {
    if (active === destination) setDestination(null);
  }, [active, destination]);
  function switchPlanet(planet: PlanetId) {
    if (planet === current || destination) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(`/explorer/${planet}`);
      return;
    }
    setDestination(planet);
    clearTimer();
    timer.current = window.setTimeout(() => {
      navigate(`/explorer/${planet}`);
      timer.current = null;
    }, 530);
  }
  return (
    <div className="planet-switcher" aria-label="Select planet">
      {(Object.keys(planetNames) as PlanetId[]).map((planet) => (
        <button type="button" key={planet} className={planet === current ? "is-active" : ""}
          aria-pressed={planet === current} disabled={destination !== null}
          onClick={() => switchPlanet(planet)}>
          <span className={`planet-switcher__dot planet-switcher__dot--${planet}`} />
          {planetNames[planet]}
        </button>
      ))}
      {destination && createPortal(
        <div className={`planet-jump planet-jump--${destination}`} role="status" aria-live="polite">
          <div className="planet-jump__stars" aria-hidden="true" />
          <div className="planet-jump__orb" aria-hidden="true"><span /></div>
          <p>TRANSFERRING VISUALIZATION</p>
          <strong>{planetNames[current]} <ArrowRight size={22} aria-hidden="true" /> {planetNames[destination]}</strong>
          <small>Opening {planetNames[destination]} exploration workspace</small>
          <div className="planet-jump__track" aria-hidden="true"><span /></div>
        </div>, document.body)
      }
    </div>
  );
}

export function AppHeader({ active }: { active?: PlanetId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  const { reference } = useExplorer();
  const discoveryTo = reference ? `/discovery?referenceId=${encodeURIComponent(reference.id)}` : "/discovery";
  return (
    <header className="app-header">
      <NavLink to="/" className="wordmark" aria-label="SciVerse home">
        <SciVerseGlyph />
        <span>SCI<span>VERSE</span></span>
      </NavLink>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink key={item.label} to={item.label === "Discover" ? discoveryTo : item.to} className={({ isActive }) => `nav-link ${item.label === "Science" ? location.pathname === "/mission" && location.hash === "#method" ? "is-active" : "" : item.label === "Mission" ? location.pathname === "/mission" && location.hash !== "#method" ? "is-active" : "" : isActive ? "is-active" : ""}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button className="header-journey" type="button" onClick={() => setJourneyOpen(true)} aria-label="Open guided exploration"><HelpCircle size={15} /> GUIDE</button>
      <div className="header-planet-switcher">
        <PlanetSwitcher active={active} />
      </div>
      <button type="button" className="mobile-menu-trigger" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation menu">
        {menuOpen ? <X size={19} /> : <Menu size={19} />}
      </button>
      {menuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu__nav">
            {navItems.map((item) => <NavLink onClick={() => setMenuOpen(false)} key={item.label} to={item.label === "Discover" ? discoveryTo : item.to}>{item.label}</NavLink>)}
          </div>
          <PlanetSwitcher active={active} />
          <button type="button" className="mobile-journey" onClick={() => { setMenuOpen(false); setJourneyOpen(true); }}><HelpCircle size={15} /> GUIDED EXPLORATION</button>
        </div>
      )}
      <GuidedJourney open={journeyOpen} onClose={() => setJourneyOpen(false)} />
    </header>
  );
}

export function ComparisonTray() {
  const { reference, candidate, comparisonCandidates, clearComparison } = useExplorer();
  const navigate = useNavigate();
  const selectedCandidates = comparisonCandidates.length ? comparisonCandidates : candidate ? [candidate] : [];
  const primaryCandidate = candidate ?? selectedCandidates[0] ?? null;
  const displayCandidate = selectedCandidates.length > 1 && primaryCandidate ? `${primaryCandidate.title} +${selectedCandidates.length - 1}` : primaryCandidate?.title ?? "Select a demo site";
  return (
    <aside className="comparison-tray" aria-label="Current comparison selection">
      <div className="comparison-tray__signal"><Radar size={16} /></div>
      <div className="comparison-tray__item">
        <span className="eyebrow">REFERENCE</span>
        <strong>{reference?.title ?? "Select Moon or Mars"}</strong>
      </div>
      <div className="comparison-tray__connector" aria-hidden="true"><span /></div>
      <div className="comparison-tray__item">
        <span className="eyebrow">EARTH CANDIDATE{selectedCandidates.length > 1 ? `S / ${selectedCandidates.length}` : ""}</span>
        <strong>{displayCandidate}</strong>
      </div>
      <div className="comparison-tray__actions">
        <button type="button" className="tray-clear" onClick={clearComparison} aria-label="Clear comparison selection"><X size={15} /></button>
        <button type="button" className="tray-open" onClick={() => navigate(buildComparisonUrl(reference?.id, primaryCandidate?.id, selectedCandidates.map((selection) => selection.id)))}>
          OPEN LAB <ArrowUpRight size={14} />
        </button>
      </div>
    </aside>
  );
}

export function ExplorerTelemetry({ body, activeLayerCount }: { body: PlanetId; activeLayerCount: number }) {
  return (
    <footer className="explorer-telemetry">
      <span><span className="telemetry-dot" /> ACTIVE BODY <b>{planetCodes[body]}</b></span>
      <span className="telemetry-rule" />
      <span>COORDINATES <b>{body === "earth" ? "WGS84" : "PLANETOCENTRIC · +E"}</b></span>
      <span className="telemetry-rule" />
      <span>DATA MODE <b>BACKEND DATASET</b></span>
      <span className="telemetry-rule" />
      <span><Layers3 size={13} /> {activeLayerCount} ACTIVE LAYERS</span>
      <ChevronDown className="telemetry-chevron" size={15} />
    </footer>
  );
}
