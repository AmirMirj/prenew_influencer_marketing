import { describe, expect, it } from "vitest";
import { FIXTURE_CREATORS } from "@/src/fixtures/creators";
import { preserveContact, suggestPitch } from "./pitch";

describe("outreach", () => {
  it("suggested pitch mentions Prenew, the value prop, and the creator", () => {
    const creator = FIXTURE_CREATORS.find((item) => item.handle === "buildmitben");
    expect(creator).toBeDefined();
    const pitch = suggestPitch(creator!);

    expect(pitch).toContain("Prenew");
    expect(pitch.toLowerCase()).toMatch(/refurbished|value|warranty/);
    expect(
      pitch.includes(creator!.displayName) ||
        creator!.nicheTags.some((tag) => pitch.toLowerCase().includes(tag)),
    ).toBe(true);
    expect(pitch.length).toBeLessThanOrEqual(400);
  });

  it("missing contact stays explicit", () => {
    const creator = FIXTURE_CREATORS.find((item) => item.handle === "rigdoctor");
    expect(creator).toBeDefined();
    const contact = preserveContact(creator!);

    expect(contact.status).toBe("missing");
    expect(contact.value).toBeUndefined();
  });
});
