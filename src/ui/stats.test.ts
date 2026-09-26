import { describe, expect, it } from "vitest";
import type { Shortlist, ShortlistItem } from "@/src/domain/types";
import { compactNumber, computeShortlistStats, percentLabel, sparklinePath } from "./stats";

function item(overrides: Partial<ShortlistItem> & Pick<ShortlistItem, "id" | "handle" | "displayName">): ShortlistItem {
  return {
    platform: "youtube",
    profileUrl: `https://youtube.com/@${overrides.handle}`,
    followerCount: 12_000,
    engagementRate: 0.06,
    language: "de",
    market: "DE",
    nicheTags: ["gaming"],
    contentSummary: "builds",
    recentTopics: [],
    contact: { status: "found", value: "hi@studio.de" },
    foundVia: ["search"],
    fit: {
      total: 90,
      audienceMatch: 80,
      marketFit: 80,
      nicheFit: 85,
      brandFit: 85,
      engagementQuality: 80,
      activity: 70,
      brandSafety: 100,
      reasons: [],
      hiddenGem: true,
      redFlags: [],
      competitorSponsor: false,
      relativeEngagement: 1.8,
      hardwareFit: 88,
    },
    suggestedPitch: { local: "Hallo", en: "Hi", language: "de" },
    ...overrides,
  };
}

describe("shortlist stats", () => {
  it("summarizes gems, emails, platforms, and the discovery funnel", () => {
    const shortlist: Shortlist = {
      query: { market: "DE", language: "de", keywords: "budget gaming PC" },
      plan: { original: "budget gaming PC", expansions: ["gebraucht"], terms: ["budget gaming PC", "gebraucht"] },
      steps: { planned: 2, sourced: 5, filtered: 4, scored: 4 },
      items: [
        item({ id: "youtube:ben", handle: "ben", displayName: "Ben" }),
        item({
          id: "tiktok:pix",
          handle: "pix",
          displayName: "Pix",
          platform: "tiktok",
          profileUrl: "https://tiktok.com/@pix",
          contact: { status: "found", value: "@pix" },
          fit: {
            total: 80,
            audienceMatch: 70,
            marketFit: 70,
            nicheFit: 70,
            brandFit: 70,
            engagementQuality: 90,
            activity: 80,
            brandSafety: 100,
            reasons: [],
            hiddenGem: true,
            redFlags: [],
            competitorSponsor: false,
            relativeEngagement: 1.4,
            hardwareFit: 70,
          },
        }),
        item({
          id: "instagram:gpu",
          handle: "gpu",
          displayName: "GPU",
          platform: "instagram",
          profileUrl: "https://instagram.com/gpu",
          followerCount: 20_000,
          engagementRate: 0.04,
          foundVia: ["web"],
          trend: "Growing",
          fit: {
            total: 70,
            audienceMatch: 60,
            marketFit: 60,
            nicheFit: 60,
            brandFit: 60,
            engagementQuality: 50,
            activity: 60,
            brandSafety: 40,
            reasons: [],
            hiddenGem: false,
            redFlags: ["competitor sponsor"],
            competitorSponsor: true,
            relativeEngagement: 0.7,
            hardwareFit: 40,
          },
        }),
      ],
    };

    const stats = computeShortlistStats(shortlist);
    expect(stats.creators).toBe(3);
    expect(stats.gems).toBe(2);
    expect(stats.emails).toBe(2);
    expect(stats.flags).toBe(1);
    expect(stats.webFinds).toBe(1);
    expect(stats.growing).toBe(1);
    expect(stats.avgFit).toBe(80);
    expect(stats.medianFollowers).toBe(12_000);
    expect(stats.platforms.map((row) => row.count)).toEqual([1, 1, 1]);
    expect(stats.funnel.map((row) => row.count)).toEqual([5, 4, 4]);
  });

  it("formats compact counts and draws a sparkline path", () => {
    expect(compactNumber(12_400)).toBe("12.4k");
    expect(percentLabel(0.062)).toBe("6.2%");
    expect(sparklinePath([10, 20], 100, 20, 0)).toMatch(/^M0.0 20.0 L100.0 0.0$/);
    expect(sparklinePath([])).toBe("");
  });
});
