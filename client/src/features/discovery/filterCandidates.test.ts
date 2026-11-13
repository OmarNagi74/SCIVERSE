import { candidates } from "../../data/mockData";
import type { DiscoveryEnvironment, MissionObjective, ReferencePlanet, ResearchDimensionId } from "../../domain/terratwin";
import { describe, expect, it } from "vitest";
import { buildComparisonUrl } from "../../app/comparisonUrl";
import { filterDiscoveryCandidates, type DiscoveryFilterState } from "./filterCandidates";

const emptyFilters: DiscoveryFilterState = { initialized: true, targetPlanet: null, environments: [], objectives: [], dimensions: [], search: "", sort: "name", view: "map" };

describe("Global Analog Discovery filters", () => {
  const targetCases: Array<[ReferencePlanet, string[]]> = [
    ["moon", ["earth-volcanic-field-demo", "earth-polar-desert-demo"]],
    ["mars", ["earth-arid-plateau-demo", "earth-volcanic-field-demo"]],
  ];
  it.each(targetCases)("filters target planet %s", (planet, expected) => {
    expect(filterDiscoveryCandidates(candidates, { ...emptyFilters, targetPlanet: planet }, "name").map((site) => site.id)).toEqual(expected);
  });

  const environmentCases: Array<[DiscoveryEnvironment, string[]]> = [
    ["Desert", []], ["Volcanic", ["earth-volcanic-field-demo"]], ["Polar", ["earth-polar-desert-demo"]], ["Arid", ["earth-arid-plateau-demo"]],
    ["Impact Crater", []], ["Salt Flat", []], ["Cave / Subsurface", []], ["Mountainous", []],
  ];
  it.each(environmentCases)("filters environment %s", (environment, expected) => {
    expect(filterDiscoveryCandidates(candidates, { ...emptyFilters, environments: [environment] }, "name").map((site) => site.id)).toEqual(expected);
  });

  const objectiveCases: Array<[MissionObjective, string[]]> = [
    ["Rover Testing", ["earth-volcanic-field-demo"]], ["Geological Exploration", ["earth-volcanic-field-demo"]], ["Resource Exploration", []],
    ["Human Habitat Preparation", ["earth-polar-desert-demo"]], ["Equipment Testing", ["earth-arid-plateau-demo"]],
    ["Environmental Research", ["earth-arid-plateau-demo", "earth-polar-desert-demo"]],
  ];
  it.each(objectiveCases)("filters mission objective %s", (objective, expected) => {
    expect(filterDiscoveryCandidates(candidates, { ...emptyFilters, objectives: [objective] }, "name").map((site) => site.id)).toEqual(expected);
  });

  const dimensionCases: Array<[ResearchDimensionId, string[]]> = [
    ["geology", ["earth-volcanic-field-demo"]], ["terrain", ["earth-arid-plateau-demo", "earth-volcanic-field-demo"]],
    ["temperature", ["earth-polar-desert-demo"]], ["water-ice", ["earth-polar-desert-demo"]],
    ["dust-wind", ["earth-arid-plateau-demo"]], ["operations", ["earth-volcanic-field-demo", "earth-polar-desert-demo"]],
  ];
  it.each(dimensionCases)("filters research dimension %s", (dimension, expected) => {
    expect(filterDiscoveryCandidates(candidates, { ...emptyFilters, dimensions: [dimension] }, "name").map((site) => site.id)).toEqual(expected);
  });

  it("searches site name, location label, and environment without case sensitivity", () => {
    expect(filterDiscoveryCandidates(candidates, { ...emptyFilters, search: "northern CHILE" }, "name").map((site) => site.id)).toEqual(["earth-arid-plateau-demo"]);
    expect(filterDiscoveryCandidates(candidates, { ...emptyFilters, search: "volcanic" }, "name").map((site) => site.id)).toEqual(["earth-volcanic-field-demo"]);
  });

  it("combines filter groups and applies name, environment, and demo-prompt sorts", () => {
    const filtered = filterDiscoveryCandidates(candidates, { ...emptyFilters, environments: ["Volcanic", "Polar"], dimensions: ["terrain"] }, "environment");
    expect(filtered.map((site) => site.id)).toEqual(["earth-volcanic-field-demo"]);
    expect(filterDiscoveryCandidates(candidates, emptyFilters, "environment").map((site) => site.id)).toEqual(["earth-arid-plateau-demo", "earth-polar-desert-demo", "earth-volcanic-field-demo"]);
    expect(filterDiscoveryCandidates(candidates, emptyFilters, "name").map((site) => site.title)).toEqual([...candidates].map((site) => site.title).sort());
    expect(filterDiscoveryCandidates(candidates, emptyFilters, "dimensions").map((site) => site.id)).toEqual(["earth-volcanic-field-demo", "earth-polar-desert-demo", "earth-arid-plateau-demo"]);
  });
});

describe("Discovery comparison links", () => {
  it("keeps the legacy single-candidate URL shape unchanged", () => {
    expect(buildComparisonUrl("mars-jezero-context", "earth-volcanic-field-demo")).toBe("/compare?referenceId=mars-jezero-context&candidateId=earth-volcanic-field-demo");
  });

  it("encodes a unique, deterministic multi-candidate selection after the primary candidate", () => {
    expect(buildComparisonUrl("mars-jezero-context", "earth-volcanic-field-demo", ["earth-volcanic-field-demo", "earth-arid-plateau-demo", "earth-arid-plateau-demo"]))
      .toBe("/compare?referenceId=mars-jezero-context&candidateId=earth-volcanic-field-demo&candidateIds=earth-arid-plateau-demo");
  });
});
