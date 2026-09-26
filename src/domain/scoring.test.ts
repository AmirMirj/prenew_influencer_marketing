import { describe, expect, it } from "vitest";
import type { Candidate, DiscoverQuery } from "./types";
import { scoreFit } from "./scoring";

const query: DiscoverQuery = {
  market: "DE",
  language: "de",
  keywords: "budget gaming PC",
};

const microGaming: Candidate = {
  id: "youtube:buildmitben",
  platform: "youtube",
  handle: "buildmitben",
  displayName: "Build mit Ben",
  profileUrl: "https://youtube.com/@buildmitben",
  followerCount: 12_000,
  engagementRate: 0.06,
  language: "de",
  market: "DE",
  nicheTags: ["gaming", "pc build"],
  contentSummary: "German budget gaming PC builds",
  recentTopics: ["refurbished GPU"],
  contact: { status: "found", value: "hello@buildmitben.de" },
};

const megaLifestyle: Candidate = {
  id: "youtube:megavibes",
  platform: "youtube",
  handle: "megavibes",
  displayName: "Mega Vibes",
  profileUrl: "https://youtube.com/@megavibes",
  followerCount: 2_000_000,
  engagementRate: 0.01,
  language: "en",
  market: "US",
  nicheTags: ["lifestyle"],
  contentSummary: "Daily lifestyle vlogs",
  recentTopics: ["airport outfit"],
  contact: { status: "found", value: "https://youtube.com/@megavibes" },
};

describe("scoreFit", () => {
  it("micro-creator with high engagement outranks a mega-account with weak niche fit", () => {
    const micro = scoreFit(microGaming, query);
    const mega = scoreFit(megaLifestyle, query);

    expect(micro.total).toBeGreaterThan(mega.total);
    expect([...micro.reasons, ...mega.reasons].join(" ").toLowerCase()).not.toMatch(
      /follower/,
    );
  });

  it("German-language gaming content scores higher for a DE query than unrelated lifestyle content", () => {
    const german = scoreFit(microGaming, query);
    const lifestyle = scoreFit(megaLifestyle, query);

    expect(german.audienceMatch).toBeGreaterThan(lifestyle.audienceMatch);
    expect(german.total).toBeGreaterThan(lifestyle.total);
  });

  it("brand fit scores refurbished-gaming content above lifestyle without an empty-token guard", () => {
    const gaming = scoreFit(microGaming, query);
    const lifestyle = scoreFit(megaLifestyle, query);

    expect(gaming.brandFit).toBeGreaterThan(0);
    expect(gaming.brandFit).toBeLessThanOrEqual(100);
    expect(gaming.brandFit).toBeGreaterThan(lifestyle.brandFit);
    expect(lifestyle.brandFit).toBeLessThan(40);
  });
});

