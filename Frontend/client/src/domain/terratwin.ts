export type PlanetId = "earth" | "moon" | "mars";
export type ReferencePlanet = Exclude<PlanetId, "earth">;

export type DataStatus =
  | "demonstration"
  | "verified"
  | "hypothesis"
  | "missing"
  | "not-comparable";

export type Coordinate = {
  latitude: number;
  longitude: number;
  convention: string;
};

export type ResearchDimensionId = "geology" | "terrain" | "temperature" | "water-ice" | "dust-wind" | "operations";

export type DiscoveryEnvironment =
  | "Unknown"
  | "Desert"
  | "Volcanic"
  | "Polar"
  | "Arid"
  | "Impact Crater"
  | "Salt Flat"
  | "Cave / Subsurface"
  | "Mountainous";

export type MissionObjective =
  | "Rover Testing"
  | "Geological Exploration"
  | "Resource Exploration"
  | "Human Habitat Preparation"
  | "Equipment Testing"
  | "Environmental Research";

export type DiscoverySortMode = "name" | "environment" | "dimensions";
export type DiscoveryViewMode = "map" | "list";

export type DiscoveryFilterState = {
  initialized: boolean;
  targetPlanet: ReferencePlanet | null;
  environments: DiscoveryEnvironment[];
  objectives: MissionObjective[];
  dimensions: ResearchDimensionId[];
  search: string;
  sort: DiscoverySortMode;
  view: DiscoveryViewMode;
};

export type CandidateDiscoveryMetadata = {
  environment: DiscoveryEnvironment;
  targetPlanets: ReferencePlanet[];
  missionObjectives: MissionObjective[];
  researchDimensions: ResearchDimensionId[];
  suggestedApplications: string[];
  limitations: string;
  coordinateTreatment: "dataset-coordinate";
};

export type PlanetFeature = {
  id: string;
  body: PlanetId;
  title: string;
  kind: string;
  coordinate: Coordinate;
  description: string;
  context: string;
  sourceLabel: string;
  status: DataStatus;
};

export type AnalogCandidate = {
  id: string;
  body: "earth";
  title: string;
  region: string;
  coordinate: Coordinate;
  description: string;
  notice: string;
  tags: string[];
  sourceLabel: string;
  status: DataStatus;
  discovery: CandidateDiscoveryMetadata;
};

export type LayerDefinition = {
  id: string;
  label: string;
  body: PlanetId;
  kind: "visual" | "reference" | "analytical";
  description: string;
  available: boolean;
  sourceLabel: string;
};

export type ComparisonDimension = {
  id: ResearchDimensionId;
  label: string;
  status: DataStatus;
  statement: string;
  caveat: string;
};

export type Selection = {
  body: PlanetId;
  id: string;
  title: string;
  coordinate: Coordinate;
  type: "feature" | "candidate";
};

export type CameraAction = {
  kind: "zoom-in" | "zoom-out" | "home";
  nonce: number;
};

export const statusCopy: Record<DataStatus, string> = {
  demonstration: "DEMO — NOT A SCIENTIFIC OBSERVATION",
  verified: "VERIFIED SOURCE",
  hypothesis: "HYPOTHESIS",
  missing: "MISSING INFORMATION",
  "not-comparable": "NOT COMPARABLE",
};

export const planetNames: Record<PlanetId, string> = {
  earth: "Earth",
  moon: "Moon",
  mars: "Mars",
};

export const planetCodes: Record<PlanetId, string> = {
  earth: "TERRA / 01",
  moon: "LUNA / 02",
  mars: "MARS / 03",
};
