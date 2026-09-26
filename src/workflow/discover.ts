import { createWebScoutAdapter } from "@/src/adapters/webscout";
import { createYouTubeAdapter } from "@/src/adapters/youtube";
import { STUB_ADAPTERS, instagramStub, tiktokStub, youtubeStub } from "@/src/adapters/stub";
import type { PlatformAdapter } from "@/src/adapters/types";
import { planWithOptionalLlm } from "@/src/llm/client";
import { compute, isInactive } from "@/src/domain/metrics";
import { scoreFit } from "@/src/domain/scoring";
import type { Candidate, DiscoverQuery, Shortlist, ShortlistItem } from "@/src/domain/types";
import { normalizeQuery } from "@/src/domain/validate";
import { resolveContact, suggestPitch } from "@/src/outreach/pitch";

export async function discover(
  input: unknown,
  adapters: PlatformAdapter[] = defaultAdapters(),
): Promise<Shortlist> {
  const query: DiscoverQuery = normalizeQuery(input);
  const plan = await planWithOptionalLlm(query);
  const searchQuery = { ...query, keywords: plan.terms.join(" ") };
  const batches = await Promise.all(adapters.map((adapter) => adapter.search(searchQuery)));
  const merged = new Map<string, Candidate>();

  for (const candidate of batches.flat()) {
    const existing = merged.get(candidate.id);
    if (!existing) {
      merged.set(candidate.id, {
        ...candidate,
        foundVia: candidate.foundVia ?? ["search"],
      });
      continue;
    }
    existing.foundVia = [...new Set([...(existing.foundVia ?? []), ...(candidate.foundVia ?? [])])];
    if (candidate.foundOn) {
      existing.foundOn = candidate.foundOn;
    }
  }

  const sourced = [...merged.values()].map((candidate) => compute(candidate));
  const active = sourced.filter((candidate) => !isInactive(candidate));

  const items: ShortlistItem[] = active
    .map((candidate) => ({
      ...candidate,
      contact: resolveContact(candidate),
      fit: scoreFit(candidate, query),
      suggestedPitch: suggestPitch(candidate, query),
    }))
    .sort((a, b) => {
      if (b.fit.total !== a.fit.total) {
        return b.fit.total - a.fit.total;
      }
      return b.engagementRate - a.engagementRate;
    });

  return {
    query,
    plan,
    steps: {
      planned: plan.terms.length,
      sourced: sourced.length,
      filtered: active.length,
      scored: items.length,
    },
    items,
  };
}

export function defaultAdapters(): PlatformAdapter[] {
  const youtube = process.env.YOUTUBE_API_KEY
    ? createYouTubeAdapter({ apiKey: process.env.YOUTUBE_API_KEY })
    : youtubeStub;

  return [youtube, tiktokStub, instagramStub, createWebScoutAdapter()];
}

export { STUB_ADAPTERS };
