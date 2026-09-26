import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMENTS_SAMPLE_CSV,
  loadCommentSample,
  loadPartsSample,
  loadRoiSample,
  PARTS_DEMAND_CSV,
  ROI_SAMPLE_CSV,
} from "@/src/data/samples";
import type { Candidate } from "./types";
import {
  computeDemandLift,
  ctrFor,
  expectedClicksFor,
  fitSalesDrivers,
  GAMING_CTR,
  ordinaryLeastSquares,
  predictSales,
  scoreSentiment,
  TECH_CTR,
} from "./forecast";

function creator(overrides: Partial<Candidate> & Pick<Candidate, "id" | "handle">): Candidate {
  return {
    platform: "youtube",
    displayName: overrides.handle,
    profileUrl: `https://youtube.com/@${overrides.handle}`,
    followerCount: 12_000,
    engagementRate: 0.08,
    language: "de",
    market: "DE",
    nicheTags: ["gaming"],
    contentSummary: "builds",
    recentTopics: [],
    contact: { status: "missing" },
    avgViews: 10_000,
    ...overrides,
  };
}

describe("public-dataset forecasts", () => {
  it("OLS prefers engagement on a sample where sales track rate, not views", () => {
    const rows = [
      { platform: "youtube", category: "gaming", tier: "micro", engagements: 800, reach: 10_000, views: 90_000, attributed_sales: 20, engagement_rate: 0.08 },
      { platform: "youtube", category: "gaming", tier: "micro", engagements: 1_000, reach: 10_000, views: 12_000, attributed_sales: 25, engagement_rate: 0.1 },
      { platform: "youtube", category: "tech", tier: "mid", engagements: 100, reach: 20_000, views: 200_000, attributed_sales: 2, engagement_rate: 0.005 },
      { platform: "youtube", category: "tech", tier: "mid", engagements: 240, reach: 24_000, views: 18_000, attributed_sales: 3, engagement_rate: 0.01 },
      { platform: "tiktok", category: "gaming", tier: "nano", engagements: 1_500, reach: 12_000, views: 8_000, attributed_sales: 31, engagement_rate: 0.125 },
      { platform: "tiktok", category: "gaming", tier: "nano", engagements: 600, reach: 12_000, views: 70_000, attributed_sales: 12, engagement_rate: 0.05 },
    ];
    const models = fitSalesDrivers(rows);
    expect(models.engagement.r2).toBeGreaterThan(models.views.r2);
    expect(models.driver).toBe("engagement");

    const vendored = fitSalesDrivers(loadRoiSample());
    expect(vendored.driver).toBe("engagement");
    expect(vendored.engagement.r2).toBeGreaterThan(vendored.views.r2);
  });

  it("gaming creator expected clicks beat a same-views tech creator", () => {
    const gaming = creator({ id: "youtube:game", handle: "game", nicheTags: ["gaming"] });
    const tech = creator({
      id: "youtube:tech",
      handle: "tech",
      nicheTags: ["hardware review"],
      contentSummary: "GPU benches",
    });
    const gameClicks = expectedClicksFor(gaming)!;
    const techClicks = expectedClicksFor(tech)!;
    expect(ctrFor(gaming)).toBe(GAMING_CTR);
    expect(ctrFor(tech)).toBe(TECH_CTR);
    expect(gameClicks.expectedClicks).toBeGreaterThan(techClicks.expectedClicks);
    expect(gameClicks.expectedClicks).toBe(Math.round(10_000 * 0.0036));
    expect(techClicks.expectedClicks).toBe(Math.round(10_000 * 0.0027));
  });

  it("BudgetBuild comments stay non-negative; scam scores negative", () => {
    expect(scoreSentiment("#BudgetBuild pelikone under 700e")).not.toBe("negative");
    expect(scoreSentiment("Warranty vs P2P is the real value")).toBe("positive");
    expect(scoreSentiment("Scam sponsor energy. Mining cards everywhere.")).toBe("negative");
    const budget = loadCommentSample().find((row) => row.hashtags.includes("#BudgetBuild"));
    expect(budget).toBeTruthy();
    expect(scoreSentiment(`${budget!.hashtags} ${budget!.text}`)).not.toBe("negative");
  });

  it("campaign-window GPU mean is above baseline", () => {
    const demand = computeDemandLift(loadPartsSample());
    expect(demand.campaignGpuMean).toBeGreaterThan(demand.baselineGpuMean);
    expect(demand.gpuLift).toBeGreaterThan(1);
  });

  it("applies the winning sales coefficient as modeled units", () => {
    const high = predictSales(creator({ id: "youtube:hot", handle: "hot", engagementRate: 0.12 }));
    const low = predictSales(creator({ id: "youtube:cold", handle: "cold", engagementRate: 0.01 }));
    expect(high?.salesDriver).toBe("engagement");
    expect(low?.salesDriver).toBe("engagement");
    expect(high!.predictedSales).toBeGreaterThan(low!.predictedSales);
  });

  it("vendored CSVs stay in-repo and match the typed samples", () => {
    const root = resolve(__dirname, "../data");
    expect(readFileSync(resolve(root, "roi-sample.csv"), "utf8").trim()).toBe(ROI_SAMPLE_CSV.trim());
    expect(readFileSync(resolve(root, "parts-demand-sample.csv"), "utf8").trim()).toBe(
      PARTS_DEMAND_CSV.trim(),
    );
    expect(readFileSync(resolve(root, "comments-sample.csv"), "utf8").trim()).toBe(
      COMMENTS_SAMPLE_CSV.trim(),
    );
    expect(ordinaryLeastSquares([1, 2, 3], [2, 4, 6]).r2).toBeCloseTo(1);
  });
});
