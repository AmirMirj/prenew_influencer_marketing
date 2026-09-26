import { describe, expect, it, vi } from "vitest";
import {
  candidatesFromPage,
  createWebScoutAdapter,
  extractChannelMentions,
  isAllowedScoutHost,
  pageMatchesQuery,
} from "./webscout";
import { SCOUT_CORPUS } from "@/src/fixtures/webpages";

describe("web scout", () => {
  it("extracts public channel URLs and emails without inventing contact", () => {
    const page = SCOUT_CORPUS.find((entry) => entry.id === "murobbs-pelikone")!;
    const mentions = extractChannelMentions(page.html);
    expect(mentions).toEqual([
      { platform: "youtube", handle: "konekaveri", url: "https://youtube.com/@konekaveri" },
    ]);
    const [candidate] = candidatesFromPage(page, page.html);
    expect(candidate.handle).toBe("konekaveri");
    expect(candidate.foundVia).toEqual(["web"]);
    expect(candidate.contact.value).toBe("moro@konekaveri.fi");
    expect(candidatesFromPage(page, "<p>https://youtube.com/@unknownnano</p>")).toEqual([]);
  });

  it("only reads allowlisted public hosts and matches local terms", () => {
    expect(isAllowedScoutHost("www.computerbase.de")).toBe(true);
    expect(isAllowedScoutHost("evil.example")).toBe(false);
    const fi = SCOUT_CORPUS.find((entry) => entry.id === "murobbs-pelikone")!;
    expect(pageMatchesQuery(fi, { market: "FI", language: "fi", keywords: "pelikone" })).toBe(true);
    expect(pageMatchesQuery(fi, { market: "DE", language: "de", keywords: "pelikone" })).toBe(false);
  });

  it("falls back to the offline corpus when live fetch fails", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const scout = createWebScoutAdapter({ fetchFn: fetchFn as unknown as typeof fetch, live: true });
    const results = await scout.search({
      market: "FI",
      language: "fi",
      keywords: "budget gaming PC pelikone",
      followerBand: "micro",
    });
    expect(fetchFn).toHaveBeenCalled();
    expect(results.some((item) => item.handle === "konekaveri")).toBe(true);
  });

  it("finds German builders on ComputerBase and Hardwareluxx snapshots", async () => {
    const scout = createWebScoutAdapter({ live: false });
    const results = await scout.search({
      market: "DE",
      language: "de",
      keywords: "gebraucht gaming PC",
      followerBand: "micro",
    });
    expect(results.map((item) => item.handle).sort()).toEqual(["buildmitben", "gebrauchtgpu"]);
  });
});
