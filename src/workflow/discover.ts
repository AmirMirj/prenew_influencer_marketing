import { createYouTubeAdapter } from "@/src/adapters/youtube";
import { STUB_ADAPTERS } from "@/src/adapters/stub";
import type { PlatformAdapter } from "@/src/adapters/types";
import { scoreFit } from "@/src/domain/scoring";
import type { Candidate, DiscoverQuery, Shortlist, ShortlistItem } from "@/src/domain/types";
import { normalizeQuery } from "@/src/domain/validate";
import { preserveContact, suggestPitch } from "@/src/outreach/pitch";

export async function discover(
  input: unknown,
  adapters: PlatformAdapter[] = defaultAdapters(),
): Promise<Shortlist> {
  const query: DiscoverQuery = normalizeQuery(input);
  const batches = await Promise.all(adapters.map((adapter) => adapter.search(query)));
  const merged = new Map<string, Candidate>();

  for (const candidate of batches.flat()) {
    if (!merged.has(candidate.id)) {
      merged.set(candidate.id, candidate);
    }
  }

  const items: ShortlistItem[] = [...merged.values()]
    .map((candidate) => ({
      ...candidate,
      contact: preserveContact(candidate),
      fit: scoreFit(candidate, query),
      suggestedPitch: suggestPitch(candidate),
    }))
    .sort((a, b) => {
      if (b.fit.total !== a.fit.total) {
        return b.fit.total - a.fit.total;
      }
      return b.engagementRate - a.engagementRate;
    });

  return { query, items };
}

export function defaultAdapters(): PlatformAdapter[] {
  const youtube = process.env.YOUTUBE_API_KEY
    ? createYouTubeAdapter({ apiKey: process.env.YOUTUBE_API_KEY })
    : STUB_ADAPTERS[0];

  return [youtube, STUB_ADAPTERS[1], STUB_ADAPTERS[2]];
}
