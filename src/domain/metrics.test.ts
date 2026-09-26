import { describe, expect, it } from "vitest";
import { extractEmails, isInactive } from "./metrics";

describe("metrics", () => {
  it("Contact extractor finds email in bio text and ignores noreply", () => {
    const emails = extractEmails("Collab hello@studio.de and noreply@platform.com plus pic.png@cdn.com");
    expect(emails).toContain("hello@studio.de");
    expect(emails).not.toContain("noreply@platform.com");
  });

  it("unknown activity is not treated as inactive", () => {
    expect(isInactive({ daysSinceLastPost: undefined } as never)).toBe(false);
  });
});
