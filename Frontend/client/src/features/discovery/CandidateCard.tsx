import { StatusBadge } from "@/components/terratwin/AppChrome";
import { researchDimensionOptions } from "@/data/catalog";
import type { AnalogCandidate } from "@/domain/terratwin";
import { ArrowUpRight, Check, MapPin, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";

type CandidateCardProps = {
  candidate: AnalogCandidate;
  referenceId?: string | null;
  selected?: boolean;
  added?: boolean;
  onSelect?: (candidate: AnalogCandidate) => void;
  onAdd?: (candidate: AnalogCandidate) => void;
  onRemove?: (candidate: AnalogCandidate) => void;
};

function dimensionLabel(id: string) {
  return researchDimensionOptions.find((dimension) => dimension.id === id)?.label ?? id;
}

export default function CandidateCard({ candidate, referenceId, selected = false, added = false, onSelect, onAdd, onRemove }: CandidateCardProps) {
  const selectable = Boolean(onSelect);
  const profileHref = `/sites/${candidate.id}${referenceId ? `?referenceId=${encodeURIComponent(referenceId)}` : ""}`;
  return (
    <article className={`discovery-candidate-card ${selected ? "is-selected" : ""}`}>
      <div className="discovery-candidate-card__topline">
        <span className="panel-label">{candidate.discovery.environment.toUpperCase()} / DATASET RECORD</span>
        <div className="discovery-candidate-card__top-actions">
          {selectable && <button type="button" className="discovery-candidate-card__select" onClick={() => onSelect?.(candidate)} aria-pressed={selected}>{selected ? "SELECTED / MAP FOCUS" : "SELECT ON MAP"}</button>}
          <StatusBadge status="hypothesis" compact />
        </div>
      </div>
      <h3>{candidate.title}</h3>
      <p className="discovery-candidate-card__location"><MapPin size={13} /> {candidate.region} <span>ILLUSTRATIVE MAP POSITION</span></p>
      <p className="discovery-candidate-card__description">{candidate.description}</p>
      <p className="discovery-candidate-card__notice">{candidate.notice}</p>
      <div className="discovery-candidate-card__row"><span>TARGET SCOPE / NOT AN ANALOG CLAIM</span><div className="discovery-dimension-tags">{candidate.discovery.targetPlanets.map((planet) => <b key={planet}>{planet.toUpperCase()}</b>)}</div></div>
      <div className="discovery-candidate-card__row"><span>EXPLORATION PROMPTS</span><ul>{candidate.discovery.suggestedApplications.map((application) => <li key={application}>{application}</li>)}</ul></div>
      <div className="discovery-candidate-card__row"><span>RESEARCH DIMENSIONS</span><div className="discovery-dimension-tags">{candidate.discovery.researchDimensions.map((dimension) => <b key={dimension}>{dimensionLabel(dimension)}</b>)}</div></div>
      <div className="discovery-candidate-card__row discovery-candidate-card__limitation"><span>LIMITATION</span><p>{candidate.discovery.limitations}</p></div>
      <div className="discovery-candidate-card__data-state"><span>DATA AVAILABILITY</span><strong>No reviewed scientific dataset connected</strong></div>
      <div className="discovery-candidate-card__actions">
        <Link className="mission-button mission-button--secondary" to={profileHref}><span>VIEW DETAILS</span><ArrowUpRight size={14} /></Link>
        {added ? <button type="button" className="mission-button mission-button--secondary" onClick={() => onRemove?.(candidate)}><X size={14} /> REMOVE</button> : <button type="button" className="mission-button mission-button--primary" onClick={() => onAdd?.(candidate)}><Plus size={14} /> ADD TO COMPARISON</button>}
      </div>
      {added && <span className="discovery-candidate-card__added"><Check size={12} /> IN COMPARISON TRAY</span>}
    </article>
  );
}
