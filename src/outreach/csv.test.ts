import { describe, expect, it } from "vitest";
import type { ShortlistItem } from "@/src/domain/types";
import { CSV_HEADERS, shortlistToCsv } from "./csv";

describe("csv", () => {
  it("CSV export includes handle, platform, score, contact, hiddenGem", () => {
    const item = {
      handle: "buildmitben",
      platform: "youtube",
      market: "DE",
      followerCount: 12400,
      contact: { status: "found", value: "hello@buildmitben.de" },
      fit: { total: 90, hiddenGem: true },
      suggestedPitch: { en: "Hi Ben", local: "Hallo Ben", language: "de" },
    } as ShortlistItem;

    const csv = shortlistToCsv([item]);
    for (const header of ["handle", "platform", "fit", "hiddenGem", "contact", "pitch_local", "pitch_en"]) {
      expect(csv.split("\n")[0]).toContain(header);
    }
    expect(CSV_HEADERS).toContain("handle");
    expect(csv).toContain("buildmitben");
    expect(csv).toContain("Hallo Ben");
    expect(csv).toContain("Hi Ben");
    for (const cell of csv.split("\n")[1].split(",")) {
      expect(cell.length).toBeLessThanOrEqual(400);
    }
  });
});
