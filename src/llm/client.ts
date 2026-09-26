import { mergePlan, planSearches } from "@/src/domain/planner";
import type { DiscoverQuery, QueryPlan } from "@/src/domain/types";

export function llmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);
}

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function llmComplete(
  prompt: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  if (!llmEnabled()) {
    return null;
  }
  const apiKey = process.env.OPENAI_API_KEY || "local";
  const base = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetchFn(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = (await response.json()) as ChatResponse;
  return body.choices?.[0]?.message?.content ?? null;
}

export async function planWithOptionalLlm(
  query: DiscoverQuery,
  fetchFn?: typeof fetch,
): Promise<QueryPlan> {
  const fallback = planSearches(query);
  if (!llmEnabled()) {
    return fallback;
  }
  try {
    const raw = await llmComplete(localSearchPrompt(query), fetchFn ?? fetch);
    const parsed = parsePhraseArray(raw);
    if (parsed) {
      return mergePlan(fallback, parsed);
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function localSearchPrompt(query: DiscoverQuery): string {
  const company = [query.companyName, query.companyDescription].filter(Boolean).join(" — ");
  return (
    `Translate this English influencer brief into native search phrases for market ${query.market} ` +
    `language ${query.language}. Keywords: "${query.keywords}".` +
    (company ? ` Company: "${company}".` : "") +
    ` Reply as a JSON array of local phrases only. Do not repeat the English keywords.`
  );
}

function parsePhraseArray(raw: string | null): string[] | null {
  if (!raw) {
    return null;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
    return parsed;
  }
  return null;
}
