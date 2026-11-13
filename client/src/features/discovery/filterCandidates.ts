import type { AnalogCandidate, DiscoveryFilterState, DiscoverySortMode } from "@/domain/terratwin";

export type { DiscoveryFilterState, DiscoverySortMode };

export function filterDiscoveryCandidates(
  records: readonly AnalogCandidate[],
  filters: DiscoveryFilterState,
  sort: DiscoverySortMode,
): AnalogCandidate[] {
  const normalizedSearch = filters.search.trim().toLowerCase();
  const visible = records.filter((site) => {
    const targetMatches = !filters.targetPlanet || site.discovery.targetPlanets.includes(filters.targetPlanet);
    const environmentMatches = !filters.environments.length || filters.environments.includes(site.discovery.environment);
    const objectiveMatches = !filters.objectives.length || site.discovery.missionObjectives.some((objective) => filters.objectives.includes(objective));
    const dimensionMatches = !filters.dimensions.length || site.discovery.researchDimensions.some((dimension) => filters.dimensions.includes(dimension));
    const textMatches = !normalizedSearch || `${site.title} ${site.region} ${site.discovery.environment}`.toLowerCase().includes(normalizedSearch);
    return targetMatches && environmentMatches && objectiveMatches && dimensionMatches && textMatches;
  });

  return [...visible].sort((left, right) => {
    if (sort === "environment") return left.discovery.environment.localeCompare(right.discovery.environment) || left.title.localeCompare(right.title);
    if (sort === "dimensions") return right.discovery.researchDimensions.length - left.discovery.researchDimensions.length || left.title.localeCompare(right.title);
    return left.title.localeCompare(right.title);
  });
}
