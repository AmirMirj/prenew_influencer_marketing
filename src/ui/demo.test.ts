import { describe, expect, it } from "vitest";
import { DEMO_STEPS, demoStepAt, shouldAutoStartDemo } from "./demo";

describe("Reach demo", () => {
  it("walks brief → gems → yield → email Ben → contrast DezGamez", () => {
    expect(DEMO_STEPS.map((step) => step.id)).toEqual(["brief", "gems", "insights", "ben", "dez"]);
    expect(DEMO_STEPS[0].target).toBe("demo-guide");
    expect(DEMO_STEPS[0].brief.niche).toBe("budget-builds");
    expect(DEMO_STEPS[0].brief.market).toBe("DE");
    expect(DEMO_STEPS[3].openId).toBe("youtube:buildmitben");
    expect(DEMO_STEPS[4].brief.niche).toBe("gpu-reviews");
    expect(DEMO_STEPS[4].openId).toBe("youtube:dezgamez");
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
});
