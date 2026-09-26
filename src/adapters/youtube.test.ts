import { describe, expect, it, vi } from "vitest";
import { createYouTubeAdapter } from "./youtube";

describe("YouTube adapter", () => {
  it("YouTube adapter maps Data API results onto Candidate without calling the network in tests", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/videos")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      if (url.includes("type=video") || url.includes("channelId=")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
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
    expect(results[0].recentPosts).toBeUndefined();
    expect(results[0].daysSinceLastPost).toBeUndefined();

    expect(fetchFn).toHaveBeenCalled();
    for (const [url] of fetchFn.mock.calls) {
      expect(String(url)).toContain("https://www.googleapis.com/youtube/v3");
    }
    expect(fetchFn.mock.calls.some(([url]) => String(url).includes("youtube.com") && !String(url).includes("googleapis.com"))).toBe(false);
  });

  it("maps videos.list onto recentPosts and still returns the channel if that call is empty", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/videos")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "vid1",
                snippet: { publishedAt: "2026-09-01T00:00:00Z", title: "4060 build" },
                statistics: { viewCount: "10000", likeCount: "600", commentCount: "40" },
                contentDetails: { duration: "PT12M" },
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("type=video")) {
        return new Response(
          JSON.stringify({ items: [{ id: { videoId: "vid1" }, snippet: { title: "4060 build" } }] }),
          { status: 200 },
        );
      }
      if (url.includes("/search")) {
        return new Response(
          JSON.stringify({ items: [{ id: { channelId: "UC123" }, snippet: { title: "Build mit Ben" } }] }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "UC123",
              snippet: { title: "Build mit Ben", customUrl: "@buildmitben" },
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

    expect(results[0].recentPosts?.[0]?.views).toBe(10000);
    expect(results[0].recentPosts?.[0]?.isShort).toBe(false);
  });
});
