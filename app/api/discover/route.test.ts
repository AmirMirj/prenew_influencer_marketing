import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/discover", () => {
  beforeEach(() => {
    delete process.env.YOUTUBE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.WEB_SCOUT_LIVE;
  });

  it("POST /api/discover returns a ranked shortlist", async () => {
    const response = await POST(
      new Request("http://localhost/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: "DE",
          language: "de",
          keywords: "budget gaming PC",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.query.market).toBe("DE");
    expect(body.items.length).toBeGreaterThan(0);
    const totals = body.items.map((item: { fit: { total: number } }) => item.fit.total);
    expect(totals).toEqual([...totals].sort((a: number, b: number) => b - a));
  });

  it("POST /api/discover returns 400 for an invalid body", async () => {
    const response = await POST(
      new Request("http://localhost/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "DE", language: "de" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/keywords/i);
  });
});
