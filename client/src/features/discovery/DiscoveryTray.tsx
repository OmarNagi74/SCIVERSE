import { buildComparisonUrl } from "@/app/comparisonUrl";
import type { ReferencePlanet, Selection } from "@/domain/terratwin";
import { ArrowUpRight, Radar, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

type DiscoveryTrayProps = {
  reference: Selection | null;
  candidates: Selection[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export default function DiscoveryTray({ reference, candidates, onRemove, onClear }: DiscoveryTrayProps) {
  const navigate = useNavigate();
  const canOpen = Boolean(reference && candidates.length);
  const openComparison = () => {
    if (!reference || !candidates.length) return;
    navigate(buildComparisonUrl(reference.id, candidates[0].id, candidates.map((candidate) => candidate.id)));
  };
  const openReferenceExplorer = (planet: ReferencePlanet) => navigate(`/explorer/${planet}`);

  return (
    <aside className="discovery-tray" aria-label="Discovery comparison tray">
      <div className="discovery-tray__signal"><Radar size={17} /></div>
      <div className="discovery-tray__reference"><span className="eyebrow">PLANETARY REFERENCE</span><strong>{reference ? `${reference.body.toUpperCase()} · ${reference.title}` : "REFERENCE REQUIRED"}</strong>{reference ? <small>Preserved from the Explorer</small> : <div className="discovery-tray__reference-links">{(["moon", "mars"] as ReferencePlanet[]).map((planet) => <button type="button" key={planet} onClick={() => openReferenceExplorer(planet)}>SELECT IN {planet.toUpperCase()} EXPLORER <ArrowUpRight size={11} /></button>)}</div>}</div>
      <div className="discovery-tray__divider" />
      <div className="discovery-tray__candidates"><span className="eyebrow">EARTH CANDIDATES / {candidates.length.toString().padStart(2, "0")}</span>{candidates.length ? <div>{candidates.map((candidate) => <span className="discovery-tray__candidate" key={candidate.id}>{candidate.title}<button type="button" onClick={() => onRemove(candidate.id)} aria-label={`Remove ${candidate.title} from comparison`}><X size={12} /></button></span>)}</div> : <small>Add demonstration candidates from the field index.</small>}</div>
      <div className="discovery-tray__actions"><button type="button" className="tray-clear" onClick={onClear} disabled={!candidates.length}><Trash2 size={14} /> CLEAR</button><button type="button" className="mission-button mission-button--primary" disabled={!canOpen} onClick={openComparison} title={!canOpen ? "Select a planetary reference and at least one Earth candidate first." : undefined}>OPEN COMPARISON LAB <ArrowUpRight size={15} /></button></div>
    </aside>
  );
}
