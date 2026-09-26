import { describe, expect, it } from "vitest";
import { PRENEW_BRAND } from "@/src/domain/brand";

describe("scaffold smoke", () => {
  it("exposes Prenew brand context", () => {
    expect(PRENEW_BRAND.name).toBe("Prenew");
    expect(PRENEW_BRAND.product).toContain("refurbished");
  });
});
