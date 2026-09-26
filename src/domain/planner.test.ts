import { describe, expect, it } from "vitest";
import { mergePlan, planSearches } from "./planner";

describe("planner", () => {
  it("Query planner expands DE/FI briefs into local terms (heuristic)", () => {
    const de = planSearches({ market: "DE", language: "de", keywords: "budget gaming PC" });
    expect(de.expansions.join(" ").toLowerCase()).toMatch(/preis-leistung|gebraucht/);

    const fi = planSearches({ market: "FI", language: "fi", keywords: "budget gaming PC" });
    expect(fi.expansions.join(" ").toLowerCase()).toMatch(/pelikone|käytetty/);
  });

  it("merges niche extra terms into the local expansions", () => {
    const refurbished = planSearches({
      market: "DE",
      language: "de",
      keywords: "refurbished hardware",
      niche: "refurbished",
    });
    expect(refurbished.expansions.join(" ").toLowerCase()).toMatch(/gebraucht|second-hand/);

    const gpu = planSearches({
      market: "DE",
      language: "de",
      keywords: "hardware review GPU",
      niche: "gpu-reviews",
    });
    expect(gpu.expansions.join(" ")).toMatch(/GPU|RTX/);
  });

  it("keeps heuristic locals when extra LLM phrases are merged", () => {
    const base = planSearches({ market: "FI", language: "fi", keywords: "budget gaming PC" });
    const merged = mergePlan(base, ["halpa pelikone"]);
    expect(merged.expansions.join(" ").toLowerCase()).toMatch(/pelikone|käytetty/);
    expect(merged.expansions).toContain("halpa pelikone");
  });
});
