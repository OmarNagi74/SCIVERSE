import { getCandidate, getFeature } from "@/data/catalog";
import type { CameraAction, DiscoveryFilterState, PlanetFeature, Selection } from "@/domain/terratwin";
import { createContext, type Dispatch, type ReactNode, type SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ExplorerContextValue = {
  reference: Selection | null;
  candidate: Selection | null;
  comparisonCandidates: Selection[];
  discoveryFilters: DiscoveryFilterState;
  setDiscoveryFilters: Dispatch<SetStateAction<DiscoveryFilterState>>;
  setReferenceFeature: (feature: PlanetFeature) => boolean;
  setReferenceById: (id: string) => boolean;
  setCandidateById: (id: string) => boolean;
  setActiveCandidateById: (id: string) => boolean;
  addCandidateById: (id: string) => boolean;
  removeCandidateById: (id: string) => void;
  clearCandidateSelections: () => void;
  setComparisonByIds: (referenceId: string | null, candidateId: string | null) => void;
  setComparisonCandidateIds: (candidateIds: string[]) => void;
  clearComparison: () => void;
  cameraAction: CameraAction;
  sendCameraAction: (kind: CameraAction["kind"]) => void;
};

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

function asReferenceSelection(feature: PlanetFeature): Selection | null {
  if (feature.body === "earth") return null;
  return { body: feature.body, id: feature.id, title: feature.title, coordinate: feature.coordinate, type: "feature" };
}

function asCandidateSelection(id: string): Selection | null {
  const candidate = getCandidate(id);
  if (!candidate) return null;
  return { body: "earth", id: candidate.id, title: candidate.title, coordinate: candidate.coordinate, type: "candidate" };
}

function uniqueCandidateSelections(ids: string[]) {
  const seen = new Set<string>();
  return ids.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const candidate = asCandidateSelection(id);
    return candidate ? [candidate] : [];
  });
}

// Only well-known catalog identifiers are rehydrated: never trust stale storage as evidence.
const SESSION_KEY = "sciverse:exploration:v1";
const LEGACY_SESSION_KEY = "terratwin:exploration:v1"; // Migration only; never displayed.
const emptyFilters: DiscoveryFilterState = { initialized: false, targetPlanet: null, environments: [], objectives: [], dimensions: [], search: "", sort: "name", view: "map" };
type SavedExploration = { referenceId?: string; activeCandidateId?: string; candidateIds?: string[]; filters?: DiscoveryFilterState };
function readSavedExploration(): SavedExploration {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object" && !Array.isArray(saved)) return saved as SavedExploration;
  } catch { /* Private browsing and corrupted state fall back to defaults. */ }
  return {};
}
function savedFilters(filters: SavedExploration["filters"]): DiscoveryFilterState {
  if (!filters || typeof filters !== "object") return emptyFilters;
  const known = emptyFilters;
  const safeList = <T extends string>(v: unknown): T[] => Array.isArray(v) ? v.filter((item): item is T => typeof item === "string").slice(0, 20) : [];
  return {
    initialized: Boolean(filters.initialized),
    targetPlanet: filters.targetPlanet === "moon" || filters.targetPlanet === "mars" ? filters.targetPlanet : null,
    environments: safeList(filters.environments), objectives: safeList(filters.objectives), dimensions: safeList(filters.dimensions),
    search: typeof filters.search === "string" ? filters.search.slice(0, 150) : "",
    sort: ["name", "environment", "dimensions"].includes(filters.sort) ? filters.sort : known.sort,
    view: filters.view === "list" ? "list" : "map",
  };
}

export function ExplorerProvider({ children }: { children: ReactNode }) {
  const [restored] = useState(readSavedExploration);
  const [reference, setReference] = useState<Selection | null>(() => {
    const feature = restored.referenceId ? getFeature(restored.referenceId) : undefined;
    return feature ? asReferenceSelection(feature) : null;
  });
  const [candidate, setCandidate] = useState<Selection | null>(() => restored.activeCandidateId ? asCandidateSelection(restored.activeCandidateId) : null);
  const [comparisonCandidates, setComparisonCandidates] = useState<Selection[]>(() => uniqueCandidateSelections(restored.candidateIds ?? []));
  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFilterState>(() => savedFilters(restored.filters));
  const [cameraAction, setCameraAction] = useState<CameraAction>({ kind: "home", nonce: 0 });

  useEffect(() => {
    try {
      const payload: SavedExploration = {
        referenceId: reference?.id,
        activeCandidateId: candidate?.id,
        candidateIds: comparisonCandidates.map((item) => item.id),
        filters: discoveryFilters,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch { /* Storage is optional. */ }
  }, [reference, candidate, comparisonCandidates, discoveryFilters]);

  const setReferenceFeature = useCallback((feature: PlanetFeature) => {
    const next = asReferenceSelection(feature);
    if (!next) return false;
    setReference(next);
    return true;
  }, []);

  const setReferenceById = useCallback((id: string) => {
    const feature = getFeature(id);
    if (!feature) return false;
    return setReferenceFeature(feature);
  }, [setReferenceFeature]);

  const setActiveCandidateById = useCallback((id: string) => {
    const next = asCandidateSelection(id);
    if (!next) return false;
    setCandidate(next);
    return true;
  }, []);

  const setCandidateById = useCallback((id: string) => {
    const next = asCandidateSelection(id);
    if (!next) return false;
    setCandidate(next);
    setComparisonCandidates((current) => current.length <= 1 ? [next] : current);
    return true;
  }, []);

  const addCandidateById = useCallback((id: string) => {
    const next = asCandidateSelection(id);
    if (!next) return false;
    setCandidate(next);
    setComparisonCandidates((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
    return true;
  }, []);

  const removeCandidateById = useCallback((id: string) => {
    setComparisonCandidates((current) => current.filter((item) => item.id !== id));
    setCandidate((active) => active?.id === id ? null : active);
  }, []);

  const clearCandidateSelections = useCallback(() => {
    setCandidate(null);
    setComparisonCandidates([]);
  }, []);

  const setComparisonByIds = useCallback((referenceId: string | null, candidateId: string | null) => {
    const feature = referenceId ? getFeature(referenceId) : undefined;
    const nextReference = feature ? asReferenceSelection(feature) : null;
    const nextCandidate = candidateId ? asCandidateSelection(candidateId) : null;
    setReference(nextReference);
    setCandidate(nextCandidate);
    setComparisonCandidates(nextCandidate ? [nextCandidate] : []);
  }, []);

  const setComparisonCandidateIds = useCallback((candidateIds: string[]) => {
    const next = uniqueCandidateSelections(candidateIds);
    setComparisonCandidates(next);
    setCandidate((current) => next.find((item) => item.id === current?.id) ?? next[0] ?? null);
  }, []);

  const clearComparison = useCallback(() => {
    setReference(null);
    setCandidate(null);
    setComparisonCandidates([]);
  }, []);

  const sendCameraAction = useCallback((kind: CameraAction["kind"]) => {
    setCameraAction((current) => ({ kind, nonce: current.nonce + 1 }));
  }, []);

  const value = useMemo<ExplorerContextValue>(() => ({
    reference,
    candidate,
    comparisonCandidates,
    discoveryFilters,
    setDiscoveryFilters,
    setReferenceFeature,
    setReferenceById,
    setCandidateById,
    setActiveCandidateById,
    addCandidateById,
    removeCandidateById,
    clearCandidateSelections,
    setComparisonByIds,
    setComparisonCandidateIds,
    clearComparison,
    cameraAction,
    sendCameraAction,
  }), [addCandidateById, cameraAction, candidate, clearCandidateSelections, clearComparison, comparisonCandidates, discoveryFilters, reference, removeCandidateById, sendCameraAction, setActiveCandidateById, setCandidateById, setComparisonByIds, setComparisonCandidateIds, setReferenceById, setReferenceFeature]);

  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>;
}

export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (!context) throw new Error("useExplorer must be used inside ExplorerProvider");
  return context;
}

export function selectedItem(id: string | null) {
  if (!id) return undefined;
  return getFeature(id) ?? getCandidate(id);
}
