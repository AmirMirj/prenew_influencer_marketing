import { describe, expect, it } from "vitest";
import { bandLabel, copyButtonLabel, isEmail, languageLabel, marketLabel, pitchTemplate } from "./labels";

describe("human labels", () => {
  it("uses country and language names instead of ISO codes", () => {
    expect(marketLabel("DE")).toBe("Germany");
    expect(languageLabel("fi")).toBe("Finnish");
    expect(bandLabel("micro")).toContain("Small creators");
    expect(isEmail("hello@studio.de")).toBe(true);
    expect(isEmail("@pixelpreis")).toBe(false);
    expect(copyButtonLabel(false, "Copy Pitch Template")).toBe("Copy Pitch Template");
    expect(copyButtonLabel(true, "Copy Pitch Template")).toBe("Copied to Clipboard!");
    expect(pitchTemplate("Hi Ben", "Prenew")).toContain("Hardware Partnership / Prenew");
  });
});
