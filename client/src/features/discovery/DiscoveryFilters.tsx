import { discoveryEnvironmentOptions, missionObjectiveOptions, researchDimensionOptions } from "@/data/mockData";
import type { DiscoveryEnvironment, MissionObjective, ReferencePlanet, ResearchDimensionId } from "@/domain/terratwin";
import { ChevronDown, ChevronUp, FilterX, Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";

type DiscoveryFiltersProps = {
  targetPlanet: ReferencePlanet | null;
  environments: DiscoveryEnvironment[];
  objectives: MissionObjective[];
  dimensions: ResearchDimensionId[];
  search: string;
  sort: "name" | "environment" | "dimensions";
  resultCount: number;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onTargetPlanet: (planet: ReferencePlanet | null) => void;
  onToggleEnvironment: (value: DiscoveryEnvironment) => void;
  onToggleObjective: (value: MissionObjective) => void;
  onToggleDimension: (value: ResearchDimensionId) => void;
  onSearch: (value: string) => void;
  onSort: (value: "name" | "environment" | "dimensions") => void;
  onClear: () => void;
};

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return <section className="discovery-filter-group"><span className="panel-label">{label}</span><div className="discovery-filter-group__options">{children}</div></section>;
}

type ActiveChipProps = { label: string; onRemove: () => void; className?: string };
function ActiveChip({ label, onRemove, className = "" }: ActiveChipProps) {
  return <button type="button" className={`discovery-chip ${className}`} onClick={onRemove} aria-label={`Remove ${label} filter`}>{label}<X size={11} /></button>;
}

export default function DiscoveryFilters({ targetPlanet, environments, objectives, dimensions, search, sort, resultCount, mobileOpen, onToggleMobile, onTargetPlanet, onToggleEnvironment, onToggleObjective, onToggleDimension, onSearch, onSort, onClear }: DiscoveryFiltersProps) {
  const hasFilters = Boolean(targetPlanet || search || environments.length || objectives.length || dimensions.length);

  return (
    <aside className={`discovery-filters instrument-panel ${mobileOpen ? "is-mobile-open" : ""}`} aria-label="Analog discovery filters">
      <div className="discovery-filters__head">
        <div><span className="eyebrow">QUERY CONTROLS</span><h2>Scope the <em>field.</em></h2></div>
        <span className="discovery-result-count">{resultCount.toString().padStart(2, "0")} RESULTS</span>
        <button type="button" className="discovery-filters__mobile-toggle" onClick={onToggleMobile} aria-expanded={mobileOpen}><SlidersHorizontal size={14} /> FILTERS <span>{resultCount.toString().padStart(2, "0")}</span>{mobileOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
      </div>
      <div className="discovery-filters__content">
        <label className="search-input discovery-search"><Search size={15} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search a demonstration site" aria-label="Search by site name" /></label>
        <FilterGroup label="TARGET PLANET / DEMO WORKFLOW">
          {(["moon", "mars"] as ReferencePlanet[]).map((planet) => <button type="button" className={`discovery-filter-button ${targetPlanet === planet ? "is-active" : ""}`} aria-pressed={targetPlanet === planet} onClick={() => onTargetPlanet(targetPlanet === planet ? null : planet)} key={planet}>{planet.toUpperCase()}</button>)}
        </FilterGroup>
        <FilterGroup label="ENVIRONMENT TYPE">
          {discoveryEnvironmentOptions.map((environment) => <button type="button" className={`discovery-filter-button ${environments.includes(environment) ? "is-active" : ""}`} aria-pressed={environments.includes(environment)} onClick={() => onToggleEnvironment(environment)} key={environment}>{environment}</button>)}
        </FilterGroup>
        <FilterGroup label="MISSION OBJECTIVE">
          {missionObjectiveOptions.map((objective) => <button type="button" className={`discovery-filter-button ${objectives.includes(objective) ? "is-active" : ""}`} aria-pressed={objectives.includes(objective)} onClick={() => onToggleObjective(objective)} key={objective}>{objective}</button>)}
        </FilterGroup>
        <FilterGroup label="RESEARCH DIMENSIONS">
          {researchDimensionOptions.map((dimension) => <button type="button" className={`discovery-filter-button ${dimensions.includes(dimension.id) ? "is-active" : ""}`} aria-pressed={dimensions.includes(dimension.id)} onClick={() => onToggleDimension(dimension.id)} key={dimension.id}>{dimension.label}</button>)}
        </FilterGroup>
        <section className="discovery-filter-group">
          <label className="panel-label" htmlFor="discovery-sort">SORT RESULTS</label>
          <select id="discovery-sort" className="discovery-sort" value={sort} onChange={(event) => onSort(event.target.value as "name" | "environment" | "dimensions")}>
            <option value="name">Site name A–Z</option>
            <option value="environment">Environment type</option>
            <option value="dimensions">Demo rubric prompts</option>
          </select>
        </section>
        <section className="discovery-active-filters" aria-live="polite">
          <div><span className="panel-label">ACTIVE FILTERS</span>{hasFilters && <button type="button" onClick={onClear}><FilterX size={13} /> CLEAR ALL</button>}</div>
          <div className="discovery-active-filters__chips">
            {targetPlanet && <ActiveChip className="is-planet" label={`TARGET: ${targetPlanet.toUpperCase()}`} onRemove={() => onTargetPlanet(null)} />}
            {search && <ActiveChip label={`SEARCH: ${search}`} onRemove={() => onSearch("")} />}
            {environments.map((value) => <ActiveChip key={`env-${value}`} label={value} onRemove={() => onToggleEnvironment(value)} />)}
            {objectives.map((value) => <ActiveChip key={`obj-${value}`} label={value} onRemove={() => onToggleObjective(value)} />)}
            {dimensions.map((value) => <ActiveChip key={`dim-${value}`} label={researchDimensionOptions.find((dimension) => dimension.id === value)?.label ?? value} onRemove={() => onToggleDimension(value)} />)}
            {!hasFilters && <span className="discovery-filter-empty">No filters applied; all three demonstration records are visible.</span>}
          </div>
        </section>
      </div>
    </aside>
  );
}
