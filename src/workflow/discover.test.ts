import { beforeEach, describe, expect, it } from "vitest";
import { STUB_ADAPTERS } from "@/src/adapters/stub";
import { discover } from "./discover";

describe("discover", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.YOUTUBE_API_KEY;
    delete process.env.WEB_SCOUT_LIVE;
  });

  it("discover merges all platforms and ranks by fit", async () => {
    const shortlist = await discover(
      { market: "DE", language: "de", keywords: "budget gaming PC" },
      STUB_ADAPTERS,
    );

    const platforms = new Set(shortlist.items.map((item) => item.platform));
    expect(platforms.has("youtube")).toBe(true);
    expect(platforms.has("tiktok")).toBe(true);
    expect(platforms.has("instagram")).toBe(true);

    const totals = shortlist.items.map((item) => item.fit.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));

    for (const item of shortlist.items) {
      expect(item.fit).toBeDefined();
      expect(item.suggestedPitch.en.length).toBeGreaterThan(0);
    }
  });

  it("discover returns an empty shortlist when no adapters match", async () => {
    const query = { market: "JP", language: "ja", keywords: "sumo wrestling" };
    const shortlist = await discover(query, STUB_ADAPTERS);

    expect(shortlist.items).toEqual([]);
    expect(shortlist.query.market).toBe("JP");
    expect(shortlist.query.language).toBe("ja");
    expect(shortlist.query.keywords).toBe("sumo wrestling");
  });

  it("discover rejects an incomplete query", async () => {
    await expect(discover({ market: "DE", language: "de" }, STUB_ADAPTERS)).rejects.toThrow(
      /keywords is required/,
    );
  });

  it("Inactive creators (no post in 120 days) are dropped when lastPostAt is known", async () => {
    const shortlist = await discover(
      { market: "DE", language: "de", keywords: "budget gaming PC" },
      STUB_ADAPTERS,
    );

    expect(shortlist.items.some((item) => item.handle === "oldbuildde")).toBe(false);
    expect(shortlist.steps.sourced).toBeGreaterThan(shortlist.steps.filtered);
  });

  it("GPU reviews keep mid-size creators and extra niches still return someone", async () => {
    const gpu = await discover(
      {
        market: "DE",
        language: "de",
        keywords: "hardware review GPU",
        followerBand: "any",
        niche: "gpu-reviews",
      },
      STUB_ADAPTERS,
    );
    expect(gpu.query.niche).toBe("gpu-reviews");
    expect(gpu.items.some((item) => item.handle === "rigdoctor")).toBe(true);
    const dez = gpu.items.find((item) => item.handle === "dezgamez");
    expect(dez).toBeDefined();
    expect(dez?.contact.status).toBe("missing");
    expect(dez?.fit.hardwareFit).toBeLessThan(40);

    const pretty = await discover(
      {
        market: "DE",
        language: "de",
        keywords: "cable management aesthetic",
        followerBand: "micro",
        niche: "aesthetic-builds",
      },
      STUB_ADAPTERS,
    );
    expect(pretty.items.some((item) => item.handle === "buildmitben")).toBe(true);

    const studentFi = await discover(
      {
        market: "FI",
        language: "fi",
        keywords: "student first PC",
        followerBand: "micro",
        niche: "first-pc",
      },
      STUB_ADAPTERS,
    );
    expect(studentFi.items.some((item) => item.handle === "pelikonefi")).toBe(true);
  });

  it("web scout merges forum finds onto the same creator id", async () => {
    const de = await discover(
      { market: "DE", language: "de", keywords: "budget gaming PC" },
      STUB_ADAPTERS,
    );
    const ben = de.items.find((item) => item.handle === "buildmitben");
    expect(ben?.foundVia).toEqual(expect.arrayContaining(["search", "web"]));
    expect(ben?.foundOn).toMatch(/computerbase/i);

    const fi = await discover(
      { market: "FI", language: "fi", keywords: "budget gaming PC" },
      STUB_ADAPTERS,
    );
    const kone = fi.items.find((item) => item.handle === "konekaveri");
    expect(kone?.foundVia).toEqual(["web"]);
    expect(kone?.foundOn).toMatch(/murobbs/i);
  });
});
