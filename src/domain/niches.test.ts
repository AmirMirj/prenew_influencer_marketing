import { describe, expect, it } from "vitest";
import { EXTRA_NICHES, FEATURED_NICHES, nicheById, NICHES } from "./niches";

describe("niches", () => {
  it("exposes featured creator types without vague Gaming or Lifestyle chips", () => {
    expect(FEATURED_NICHES.map((niche) => niche.label)).toEqual([
      "Budget PC builds",
      "Refurbished hardware",
      "GPU reviews",
      "Value gaming",
      "Small-country gaming",
    ]);
    expect(NICHES.some((niche) => niche.label === "Gaming" || niche.label === "Lifestyle")).toBe(false);
  });

  it("maps a niche id to searchable keywords", () => {
    expect(nicheById("refurbished")?.keywords).toContain("refurbished");
    expect(nicheById("gpu-reviews")?.followerBand).toBe("any");
  });

  it("keeps extra niches behind More, still as creator types", () => {
    expect(EXTRA_NICHES.map((niche) => niche.label)).toEqual([
      "Pretty PC builds",
      "FPS / esports setups",
      "Student / first PC",
      "Repair / upgrade",
      "Creator setups",
      "Family / living-room",
    ]);
  });
});
