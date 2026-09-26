import { describe, expect, it } from "vitest";
import { FIXTURE_CREATORS } from "@/src/fixtures/creators";
import { resolveContact, suggestPitch } from "./pitch";

const deQuery = { market: "DE", language: "de", keywords: "budget gaming PC" };

describe("outreach", () => {
  it("suggested pitch mentions Prenew, the value prop, and the creator", () => {
    const creator = FIXTURE_CREATORS.find((item) => item.handle === "buildmitben");
    expect(creator).toBeDefined();
    const pitch = suggestPitch(creator!, deQuery);

    expect(pitch.en).toContain("Prenew");
    expect(pitch.en.toLowerCase()).toMatch(/refurbished|value|warranty/);
    expect(
      pitch.en.includes(creator!.displayName) ||
        creator!.nicheTags.some((tag) => pitch.en.toLowerCase().includes(tag)),
    ).toBe(true);
    expect(pitch.en.length).toBeLessThanOrEqual(400);
  });

  it("Pitch returns local + en; local uses query language", () => {
    const creator = FIXTURE_CREATORS.find((item) => item.handle === "buildmitben");
    expect(creator).toBeDefined();
    const pitch = suggestPitch(creator!, deQuery);

    expect(pitch.en).toContain("Prenew");
    expect(pitch.local).toContain("Prenew");
    expect(pitch.language).toBe("de");
    expect(pitch.local).not.toBe(pitch.en);
  });

  it("local pitches use the company name", () => {
    const creator = FIXTURE_CREATORS.find((item) => item.handle === "buildmitben");
    const de = suggestPitch(creator!, { ...deQuery, companyName: "Prenew Lab" });
    expect(de.local).toContain("Prenew Lab");
    const fi = suggestPitch(creator!, {
      market: "FI",
      language: "fi",
      keywords: "budget gaming PC",
      companyName: "Prenew Lab",
    });
    expect(fi.local).toContain("Prenew Lab");
  });

  it("missing contact stays explicit", () => {
    const creator = FIXTURE_CREATORS.find((item) => item.handle === "rigdoctor");
    expect(creator).toBeDefined();
    const contact = resolveContact({ ...creator!, bio: undefined, emails: [] });

    expect(contact.status).toBe("missing");
    expect(contact.value).toBeUndefined();
  });
});
