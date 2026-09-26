import { describe, expect, it } from "vitest";
import { STUB_ADAPTERS } from "@/src/adapters/stub";
import { discover } from "./discover";

describe("discover", () => {
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
      expect(item.suggestedPitch.length).toBeGreaterThan(0);
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
});
