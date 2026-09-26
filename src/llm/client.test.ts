import { afterEach, describe, expect, it, vi } from "vitest";
import { llmComplete, llmEnabled, planWithOptionalLlm } from "./client";

describe("optional LLM", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    vi.unstubAllGlobals();
  });

  it("stays disabled without a key", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    expect(llmEnabled()).toBe(false);
  });

  it("treats a local BASE_URL as enabled without a cloud key", () => {
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = "http://127.0.0.1:11434/v1";
    expect(llmEnabled()).toBe(true);
  });

  it("maps a mocked chat completion without a live network call", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '["gebraucht PC"]' } }] }), {
        status: 200,
      }),
    );

    const text = await llmComplete("expand", fetchFn as unknown as typeof fetch);
    expect(text).toContain("gebraucht");
    expect(fetchFn).toHaveBeenCalled();
    expect(JSON.stringify(fetchFn.mock.calls)).toContain("/chat/completions");

    const plan = await planWithOptionalLlm(
      { market: "DE", language: "de", keywords: "budget gaming PC" },
      fetchFn as unknown as typeof fetch,
    );
    expect(plan.expansions).toContain("gebraucht PC");
    expect(plan.expansions.join(" ").toLowerCase()).toMatch(/preis-leistung|gebraucht gaming/);
    expect(JSON.stringify(fetchFn.mock.calls)).toMatch(/native search phrases|JSON array of local phrases/);
  });
});
