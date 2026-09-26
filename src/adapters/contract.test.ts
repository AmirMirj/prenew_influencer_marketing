import { describe, expect, it } from "vitest";
import { instagramStub, tiktokStub, youtubeStub } from "./stub";
import type { PlatformAdapter } from "./types";

const adapters: PlatformAdapter[] = [youtubeStub, tiktokStub, instagramStub];

const matchingQuery = {
  market: "DE",
  language: "de",
  keywords: "gaming",
};

const emptyQuery = {
  market: "JP",
  language: "ja",
  keywords: "sumo",
};

describe("platform adapters", () => {
  it("every platform adapter satisfies the shared search contract", async () => {
    for (const adapter of adapters) {
      const matches = await adapter.search(matchingQuery);
      expect(Array.isArray(matches)).toBe(true);
      for (const candidate of matches) {
        expect(candidate.id).toBe(`${candidate.platform}:${candidate.handle}`);
        expect(candidate.platform).toBe(adapter.platform);
      }

      const empty = await adapter.search(emptyQuery);
      expect(empty).toEqual([]);
    }
  });

  it("stub adapters filter by market, language, keywords, and follower band", async () => {
    const query = {
      market: "DE",
      language: "de",
      keywords: "gaming",
      followerBand: "micro" as const,
    };

    for (const adapter of adapters) {
      const results = await adapter.search(query);
      for (const candidate of results) {
        expect(candidate.market).toBe("DE");
        expect(candidate.language).toBe("de");
        expect(candidate.followerCount).toBeGreaterThanOrEqual(1_000);
        expect(candidate.followerCount).toBeLessThanOrEqual(50_000);
        const haystack = [
          candidate.contentSummary,
          ...candidate.nicheTags,
          ...candidate.recentTopics,
        ]
          .join(" ")
          .toLowerCase();
        expect(haystack).toContain("gaming");
      }
    }

    const none = await youtubeStub.search(emptyQuery);
    expect(none).toEqual([]);
  });
});
