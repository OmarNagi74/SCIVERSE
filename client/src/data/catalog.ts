import type {
  AnalogCandidate,
  ComparisonDimension,
  DiscoveryEnvironment,
  LayerDefinition,
  MissionObjective,
  PlanetFeature,
  PlanetId,
  ResearchDimensionId,
} from "@/domain/terratwin";

export const planetIntro: Record<PlanetId, { eyebrow: string; title: string; description: string; visualLabel: string }> = {
  earth: {
    eyebrow: "TERRESTRIAL ANALOG FIELD",
    title: "Earth candidate field",
    description: "Explore terrestrial study areas loaded from the SciVerse backend. Research candidates require validation.",
    visualLabel: "VISUAL CONTEXT — NOT AN ANALYTICAL LAYER",
  },
  moon: {
    eyebrow: "LUNAR REFERENCE EXPLORER",
    title: "Lunar reference surface",
    description: "Inspect a curated set of lunar reference features and select one to begin an Earth analog query.",
    visualLabel: "GLD100 MID-LATITUDE TEXTURE 79°N–79°S · POLAR CAPS = NO DATA",
  },
  mars: {
    eyebrow: "MARTIAN REFERENCE EXPLORER",
    title: "Martian reference surface",
    description: "Inspect major Martian regions and create a scoped reference for an Earth analog comparison.",
    visualLabel: "SURFACE VISUALIZATION — NOT AN ANALYTICAL LAYER",
  },
};

export const discoveryEnvironmentOptions: DiscoveryEnvironment[] = [
  "Desert", "Volcanic", "Polar", "Arid", "Impact Crater", "Salt Flat", "Cave / Subsurface", "Mountainous",
];

export const missionObjectiveOptions: MissionObjective[] = [
  "Rover Testing", "Geological Exploration", "Resource Exploration", "Human Habitat Preparation", "Equipment Testing", "Environmental Research",
];

export const researchDimensionOptions: Array<{ id: ResearchDimensionId; label: string }> = [
  { id: "geology", label: "Geology" },
  { id: "terrain", label: "Terrain" },
  { id: "temperature", label: "Temperature" },
  { id: "water-ice", label: "Water and Ice" },
  { id: "dust-wind", label: "Dust and Wind" },
  { id: "operations", label: "Operational Relevance" },
];

export const features: PlanetFeature[] = [];
export const candidates: AnalogCandidate[] = [];

export const layers: LayerDefinition[] = [
  {
    id: "earth-visual",
    label: "Earth visual context",
    body: "earth",
    kind: "visual",
    description: "Rendered globe imagery for spatial orientation. This is not an analytical dataset layer.",
    available: true,
    sourceLabel: "NASA GIBS visual service where available",
  },
  {
    id: "earth-candidates",
    label: "Dataset candidate markers",
    body: "earth",
    kind: "reference",
    description: "Candidate coordinates loaded from the backend dataset.",
    available: true,
    sourceLabel: "SciVerse backend catalog",
  },
  {
    id: "earth-terrain-pending",
    label: "Analytical terrain (pending)",
    body: "earth",
    kind: "analytical",
    description: "Reserved for a reviewed terrain product and source adapter.",
    available: false,
    sourceLabel: "No active dataset",
  },
  {
    id: "moon-visual",
    label: "Lunar texture coverage (79°S–79°N)",
    body: "moon",
    kind: "visual",
    description: "GLD100-derived visualization texture covers equatorial and mid-latitude regions from 79°N to 79°S; the uncovered polar regions display a gridded no-data treatment.",
    available: true,
    sourceLabel: "USGS LROC WAC GLD100 visual preview · polar caps = no data",
  },
  {
    id: "moon-features",
    label: "Reference feature index",
    body: "moon",
    kind: "reference",
    description: "Backend target index for selection and navigation.",
    available: true,
    sourceLabel: "SciVerse backend catalog",
  },
  {
    id: "moon-topography-pending",
    label: "Global lunar topography (not connected)",
    body: "moon",
    kind: "analytical",
    description: "No global analytical topography layer is connected. A bounded source-derived Tycho relief visualization is available only in the dedicated Tycho mode; it is not a global data layer or measurement tool.",
    available: false,
    sourceLabel: "Regional Tycho display proof only",
  },
  {
    id: "mars-visual",
    label: "Martian surface visualization",
    body: "mars",
    kind: "visual",
    description: "USGS Viking mosaic preview is used for visual orientation only; it is not an analytical raster layer.",
    available: true,
    sourceLabel: "USGS Astrogeology Viking colorized-mosaic visual preview",
  },
  {
    id: "mars-features",
    label: "Reference feature index",
    body: "mars",
    kind: "reference",
    description: "Backend target index for selection and navigation.",
    available: true,
    sourceLabel: "SciVerse backend catalog",
  },
  {
    id: "mars-elevation-pending",
    label: "Analytical elevation (pending)",
    body: "mars",
    kind: "analytical",
    description: "Reserved for a reviewed Mars elevation data adapter.",
    available: false,
    sourceLabel: "No active dataset",
  },
];

export const getFeaturesForBody = (body: PlanetId) => features.filter((feature) => feature.body === body);
export const getLayersForBody = (body: PlanetId) => layers.filter((layer) => layer.body === body);
export const getFeature = (id: string) => features.find((feature) => feature.id === id);
export const getCandidate = (id: string) => candidates.find((candidate) => candidate.id === id);


export function loadCatalog(data: { features: PlanetFeature[]; candidates: AnalogCandidate[] }) {
 features.splice(0, features.length, ...data.features);
 candidates.splice(0, candidates.length, ...data.candidates);
}
