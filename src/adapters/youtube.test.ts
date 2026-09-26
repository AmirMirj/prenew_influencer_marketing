import { describe, expect, it, vi } from "vitest";
import { createYouTubeAdapter } from "./youtube";

describe("YouTube adapter", () => {
  it("YouTube adapter maps Data API results onto Candidate without calling the network in tests", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/search")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: { channelId: "UC123" },
                snippet: { title: "Build mit Ben", description: "Budget gaming PC builds" },
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "UC123",
              snippet: {
                title: "Build mit Ben",
                description: "German budget gaming PC and refurbished hardware",
                customUrl: "@buildmitben",
                country: "DE",
                defaultLanguage: "de",
              },
              statistics: { subscriberCount: "12400", viewCount: "8900000" },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const adapter = createYouTubeAdapter({ apiKey: "test-key", fetchFn: fetchFn as unknown as typeof fetch });
    const results = await adapter.search({
      market: "DE",
      language: "de",
      keywords: "budget gaming PC",
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "youtube:buildmitben",
      platform: "youtube",
      handle: "buildmitben",
      displayName: "Build mit Ben",
    });
    expect(results[0].followerCount).toBe(12400);
    expect(results[0].contact.status).toBe("found");

    expect(fetchFn).toHaveBeenCalled();
    for (const [url] of fetchFn.mock.calls) {
      expect(String(url)).toContain("https://www.googleapis.com/youtube/v3");
    }
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes("youtube.com") && !String(url).includes("googleapis.com"))).toBe(false);
  });
});
