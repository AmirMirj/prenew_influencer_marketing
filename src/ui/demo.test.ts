import { describe, expect, it } from "vitest";
import { DEMO_PRENEW, DEMO_STEPS, HOW_IT_WORKS, demoShouldSearch, demoStepAt, shouldAutoStartDemo } from "./demo";

describe("Reach demo", () => {
  it("walks brief → gems → yield → email Ben → contrast DezGamez", () => {
    expect(DEMO_STEPS.map((step) => step.id)).toEqual(["brief", "gems", "insights", "ben", "dez"]);
    expect(DEMO_STEPS[0].target).toBe("demo-guide");
    expect(DEMO_STEPS[0].brief.niche).toBe("budget-builds");
    expect(DEMO_STEPS[0].brief.market).toBe("DE");
    expect(DEMO_STEPS[3].openId).toBe("youtube:buildmitben");
    expect(DEMO_STEPS[3].target).toBe("demo-pitch");
    expect(DEMO_STEPS[4].brief.niche).toBe("gpu-reviews");
    expect(DEMO_STEPS[4].openId).toBe("youtube:dezgamez");
    expect(DEMO_STEPS[4].target).toBe("demo-pitch");
    expect(demoShouldSearch(DEMO_PRENEW, DEMO_STEPS[3])).toBe(false);
    expect(demoShouldSearch(DEMO_PRENEW, DEMO_STEPS[4])).toBe(true);
    expect(demoStepAt(99).id).toBe("dez");
  });

  it("keeps demo copy free of follower-count language", () => {
    const copy = DEMO_STEPS.map((step) => `${step.title} ${step.body}`).join(" ").toLowerCase();
    expect(copy).not.toMatch(/follower/);
  });

  it("starts from ?demo=1", () => {
    expect(shouldAutoStartDemo("?demo=1")).toBe(true);
    expect(shouldAutoStartDemo("?market=DE")).toBe(false);
  });

  it("only focuses creators the step brief actually returns", async () => {
    const { discover } = await import("@/src/workflow/discover");
    const { STUB_ADAPTERS } = await import("@/src/adapters/stub");
    for (const step of DEMO_STEPS.filter((item) => item.openId)) {
      const list = await discover(step.brief, STUB_ADAPTERS);
      expect(list.items.map((item) => item.id)).toContain(step.openId);
    }
  });

  it("maps the product as a four-step loop", () => {
    expect(HOW_IT_WORKS.map((step) => step.label)).toEqual([
      "Select Niche",
      "View Curated Specs",
      "Copy Pitch",
      "Scale with API",
    ]);
  });
});
