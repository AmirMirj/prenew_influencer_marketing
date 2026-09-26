import { describe, expect, it } from "vitest";
import { loadCommentSample, loadPartsSample, loadRoiSample } from "@/src/data/samples";
import type { Candidate } from "./types";
import {
  alignCandidate,
  alignedDemandLift,
  alignKeyOf,
  cleanActivity,
  cleanComments,
  indexByKey,
  INTERACTION_FLOOR,
  interactionVolume,
  isGameOnly,
  isViralAnomaly,
  isoWeek,
  regionOf,
  skusOf,
} from "./align";

function creator(overrides: Partial<Candidate> & Pick<Candidate, "id" | "handle">): Candidate {
  return {
    platform: "youtube",
    displayName: overrides.handle,
    profileUrl: `https://youtube.com/@${overrides.handle}`,
    followerCount: 12_000,
    engagementRate: 0.06,
    language: "de",
    market: "DE",
    nicheTags: ["gaming"],
    contentSummary: "used RTX 4060 builds",
    recentTopics: ["RTX 4060"],
    contact: { status: "missing" },
    hardware: { gpu: "RTX 4060 (used)" },
    recentPosts: [{ date: "2026-09-14T12:00:00.000Z", views: 12_000, text: "used 4060 warranty" }],
    ...overrides,
  };
}

describe("multi-dataset alignment", () => {
  it("joins activity, comments, and demand on week × SKU × region", () => {
    const activity = indexByKey(loadRoiSample());
    const social = indexByKey(cleanComments());
    const demand = indexByKey(loadPartsSample());
    const key = alignKeyOf("2026-W38", "4060", "DACH");
    expect(activity.has(key)).toBe(true);
    expect(social.has(key)).toBe(true);
    expect(demand.has(key)).toBe(true);

    const ben = alignCandidate(creator({ id: "youtube:ben", handle: "buildmitben" }));
    expect(ben.matchedSides).toBe(3);
    expect(ben.temporalAnchor).toBe(true);
    expect(ben.key).toEqual({ week: "2026-W38", sku: "4060", region: "DACH" });
    expect(ben.volumeOk).toBe(true);
    expect(ben.interactionVolume).toBeGreaterThanOrEqual(INTERACTION_FLOOR);
  });

  it("does not join DACH 4060 to a Nordics or 5090 row", () => {
    const demand = indexByKey(loadPartsSample());
    expect(demand.has(alignKeyOf("2026-W38", "4060", "NORDICS"))).toBe(true);
    expect(demand.has(alignKeyOf("2026-W38", "5090", "DACH"))).toBe(true);
    const ben = alignCandidate(creator({ id: "youtube:ben", handle: "buildmitben" }));
    expect(ben.key?.region).toBe("DACH");
    expect(ben.key?.sku).toBe("4060");
    expect(ben.key?.sku).not.toBe("5090");
  });

  it("keeps RTX-in-Cyberpunk and drops game-only comments", () => {
    expect(isGameOnly("Night city fashion. #Cyberpunk2077")).toBe(true);
    expect(isGameOnly("4060 holds 60fps in Cyberpunk. Warranty still the point.")).toBe(false);
    const cleaned = cleanComments(loadCommentSample());
    expect(cleaned.some((row) => row.text.includes("Night city"))).toBe(false);
    expect(cleaned.some((row) => row.text.includes("60fps"))).toBe(true);
  });

  it("holds out viral anomalies with huge views and no hardware conversion", () => {
    expect(isViralAnomaly({ views: 2_000_000, sku: undefined, attributed_sales: 0, text: "airport outfit" })).toBe(
      true,
    );
    expect(isViralAnomaly({ views: 12_000, sku: "4060", attributed_sales: 40, text: "used 4060" })).toBe(false);
    const cleaned = cleanActivity(loadRoiSample());
    expect(cleaned.some((row) => row.handle === "megavibes")).toBe(false);
    expect(interactionVolume(cleaned)).toBeGreaterThanOrEqual(INTERACTION_FLOOR);

    const vibe = alignCandidate(
      creator({
        id: "youtube:megavibes",
        handle: "megavibes",
        market: "US",
        nicheTags: ["lifestyle"],
        contentSummary: "Daily lifestyle vlogs",
        recentTopics: ["airport outfit"],
        hardware: undefined,
        avgViews: 390_000,
        recentPosts: [{ date: "2026-09-14T12:00:00.000Z", views: 400_000, text: "airport outfit" }],
      }),
    );
    expect(vibe.viralOutlier).toBe(true);
    expect(alignedDemandLift(vibe)).toBeUndefined();
  });

  it("maps country codes onto DACH / Nordics / UK and reads ISO weeks", () => {
    expect(regionOf("DE")).toBe("DACH");
    expect(regionOf("FI")).toBe("NORDICS");
    expect(regionOf("GB")).toBe("UK");
    expect(isoWeek("2026-09-14T12:00:00.000Z")).toBe("2026-W38");
    expect(skusOf("Gigabyte GeForce RTX 5090")).toEqual(["5090"]);
  });
});
