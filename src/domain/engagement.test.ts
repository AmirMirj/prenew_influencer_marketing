import { describe, expect, it } from "vitest";
import {
  applyFitModifiers,
  expectedInteractions,
  isHiddenGem,
  isPassiveMega,
  recencyMultiplier,
  relativeEngagementRatio,
  weightedInteractions,
} from "./engagement";

describe("engagement-vs-typical", () => {
  it("a 10k creator with 50k-band comment volume scores above 1.5× typical", () => {
    const posts = Array.from({ length: 10 }, (_, index) => ({
      date: new Date(Date.now() - (index + 2) * 86_400_000).toISOString(),
      likes: 400,
      comments: 180,
      shares: 40,
      saves: 25,
    }));
    const ratio = relativeEngagementRatio("youtube", 10_000, posts);
    expect(ratio).toBeGreaterThan(1.5);
    expect(expectedInteractions("youtube", 150_000)).toBeGreaterThan(
      expectedInteractions("youtube", 10_000),
    );
  });

  it("comments and shares outrank the same count of likes", () => {
    expect(weightedInteractions({ comments: 50, likes: 0 })).toBeGreaterThan(
      weightedInteractions({ likes: 50, comments: 0 }),
    );
    expect(weightedInteractions({ shares: 20, likes: 0 })).toBeGreaterThan(
      weightedInteractions({ likes: 20, comments: 0 }),
    );
  });

  it("weekly uploaders keep a full recency multiplier; 90-day gaps decay", () => {
    expect(recencyMultiplier(3)).toBe(1);
    expect(recencyMultiplier(90)).toBeLessThan(recencyMultiplier(14));
    expect(recencyMultiplier(undefined)).toBe(1);
  });

  it("hidden gem boost lifts a qualifying micro above a penalized peer", () => {
    expect(isHiddenGem(12_000, 80, 80)).toBe(true);
    expect(isHiddenGem(80_000, 80, 80)).toBe(false);
    expect(applyFitModifiers(80, { hiddenGem: true, penalize: false })).toBe(88);
    expect(applyFitModifiers(80, { hiddenGem: false, penalize: true })).toBe(65);
    expect(isPassiveMega(2_000_000, 0.4, 20)).toBe(true);
    expect(isPassiveMega(12_000, 0.4, 20)).toBe(false);
    expect(applyFitModifiers(80, { hiddenGem: false, penalize: false, passiveMega: true })).toBe(72);
  });
});
