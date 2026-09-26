import { describe, expect, it } from "vitest";
import { maskName, previewCreators } from "./preview";

describe("landing previews", () => {
  it("shows Finland budget cards without leaking emails", () => {
    const cards = previewCreators({
      market: "FI",
      language: "fi",
      keywords: "budget gaming PC",
      followerBand: "micro",
    });
    expect(cards.length).toBeGreaterThan(1);
    expect(cards.some((card) => card.niche.toLowerCase().includes("gaming"))).toBe(true);
    expect(JSON.stringify(cards)).not.toMatch(/@/);
    expect(cards.every((card) => card.mask.includes("·"))).toBe(true);
  });

  it("Germany and Finland previews stay in-market", () => {
    const de = previewCreators({
      market: "DE",
      language: "de",
      keywords: "budget gaming PC",
      followerBand: "micro",
    });
    const fi = previewCreators({
      market: "FI",
      language: "fi",
      keywords: "budget gaming PC",
      followerBand: "micro",
    });
    expect(de.length).toBeGreaterThan(0);
    expect(fi.length).toBeGreaterThan(0);
    expect(de.map((card) => card.id).join()).not.toBe(fi.map((card) => card.id).join());
  });

  it("masks display names", () => {
    expect(maskName("Build mit Ben")).toMatch(/^B/);
    expect(maskName("Build mit Ben")).not.toContain("Ben");
  });

  it("keeps abandoned channels out of previews", () => {
    const de = previewCreators({
      market: "DE",
      language: "de",
      keywords: "budget gaming PC",
      followerBand: "micro",
    });
    const fi = previewCreators({
      market: "FI",
      language: "fi",
      keywords: "budget gaming PC",
      followerBand: "micro",
    });
    expect(de.map((card) => card.id)).not.toContain("youtube:oldbuildde");
    expect(fi.map((card) => card.id)).toContain("youtube:konekaveri");
  });
});
