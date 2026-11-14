import { describe, expect, it } from "vitest";
import { candidates, features } from "../../data/catalog";
import { buildComparisonUrl } from "../../app/comparisonUrl";
describe("Backend-only catalog", () => {
  it("ships no prefilled candidate or target records", () => {
    expect(candidates).toEqual([]);
    expect(features).toEqual([]);
  });
  it("preserves backend identifiers in comparison links", () => {
    expect(buildComparisonUrl("mars_jezero", "gilf_kebir_eg")).toBe("/compare?referenceId=mars_jezero&candidateId=gilf_kebir_eg");
  });
});
