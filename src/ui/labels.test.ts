import { describe, expect, it } from "vitest";
import { bandLabel, isEmail, languageLabel, marketLabel } from "./labels";

describe("human labels", () => {
  it("uses country and language names instead of ISO codes", () => {
    expect(marketLabel("DE")).toBe("Germany");
    expect(languageLabel("fi")).toBe("Finnish");
    expect(bandLabel("micro")).toContain("Small creators");
    expect(isEmail("hello@studio.de")).toBe(true);
    expect(isEmail("@pixelpreis")).toBe(false);
  });
});
