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
  engagementRate: 0.08,
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
    expect([...micro.reasons, ...mega.reasons].join(" ").toLowerCase()).not.toMatch(/follower/);
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

  it("Hidden gem: micro + high relative engagement + high niche", () => {
    expect(scoreFit(microGaming, query).hiddenGem).toBe(true);
    expect(scoreFit(megaLifestyle, query).hiddenGem).toBe(false);
  });

  it("passive mega-accounts lose to a high-engagement micro in the same niche", () => {
    const megaGaming: Candidate = {
      ...microGaming,
      id: "youtube:megabuild",
      handle: "megabuild",
      displayName: "Mega Build",
      followerCount: 2_000_000,
      engagementRate: 0.01,
    };
    const micro = scoreFit(microGaming, query);
    const mega = scoreFit(megaGaming, query);
    expect(micro.total).toBeGreaterThan(mega.total);
    expect(mega.hiddenGem).toBe(false);
  });

  it("Engagement vs typical: 5k / 8% outranks 200k / 1% on the engagement component", () => {
    const small: Candidate = {
      ...microGaming,
      id: "youtube:nano",
      handle: "nano",
      followerCount: 5_000,
      engagementRate: 0.08,
    };
    const mid: Candidate = {
      ...microGaming,
      id: "youtube:mid",
      handle: "midsize",
      followerCount: 200_000,
      engagementRate: 0.01,
    };

    expect(scoreFit(small, query).engagementQuality).toBeGreaterThan(scoreFit(mid, query).engagementQuality);
  });

  it("Brand-safety red flag or competitor sponsor lowers total", () => {
    const clean = scoreFit(microGaming, query);
    const sponsored = scoreFit(
      {
        ...microGaming,
        id: "youtube:mindfactoryfan",
        handle: "mindfactoryfan",
        bio: "Thanks Mindfactory for the GPU",
        recentTopics: ["Mindfactory haul"],
      },
      query,
    );

    expect(sponsored.total).toBeLessThan(clean.total);
    expect(sponsored.competitorSponsor || sponsored.redFlags.length > 0).toBe(true);
  });

  it("scans captions for competitor and safety flags", () => {
    const flagged = scoreFit(
      {
        ...microGaming,
        id: "youtube:caption",
        handle: "caption",
        recentPosts: [
          {
            date: new Date(Date.now() - 3 * 86_400_000).toISOString(),
            likes: 200,
            comments: 40,
            text: "Haul from Mindfactory — thanks for the GPU",
          },
        ],
      },
      query,
    );
    expect(flagged.competitorSponsor).toBe(true);
  });

  it("recency decay lowers engagement quality when the channel went quiet", () => {
    const recent = scoreFit(
      {
        ...microGaming,
        id: "youtube:weekly",
        handle: "weekly",
        recentPosts: [
          { date: daysAgo(3), likes: 400, comments: 90, shares: 20 },
          { date: daysAgo(10), likes: 380, comments: 80, shares: 18 },
        ],
      },
      query,
    );
    const stale = scoreFit(
      {
        ...microGaming,
        id: "youtube:stale",
        handle: "stale",
        recentPosts: [
          { date: daysAgo(80), likes: 400, comments: 90, shares: 20 },
          { date: daysAgo(88), likes: 380, comments: 80, shares: 18 },
        ],
      },
      query,
    );
    expect(recent.engagementQuality).toBeGreaterThan(stale.engagementQuality);
  });

  it("comment-heavy posts beat likes-only posts on engagement quality", () => {
    const talker = scoreFit(
      {
        ...microGaming,
        id: "youtube:talker",
        handle: "talker",
        recentPosts: [
          { date: daysAgo(4), likes: 40, comments: 80, shares: 20, saves: 15 },
          { date: daysAgo(11), likes: 35, comments: 70, shares: 18, saves: 12 },
        ],
      },
      query,
    );
    const passive = scoreFit(
      {
        ...microGaming,
        id: "youtube:passive",
        handle: "passive",
        recentPosts: [
          { date: daysAgo(4), likes: 80, comments: 2 },
          { date: daysAgo(11), likes: 70, comments: 1 },
        ],
      },
      query,
    );
    expect(talker.engagementQuality).toBeGreaterThan(passive.engagementQuality);
  });
});

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
