import { filterCandidates } from "@/src/adapters/filter";
import { FIXTURE_CREATORS, WEB_SCOUT_CREATORS } from "@/src/fixtures/creators";
import { compute, isInactive } from "@/src/domain/metrics";
import type { DiscoverQuery } from "@/src/domain/types";
import { isEmail } from "./labels";
import { compactNumber, percentLabel } from "./stats";

export type PreviewCard = {
  id: string;
  mask: string;
  niche: string;
  platform: string;
  size: string;
  engagement: string;
  hasPublicEmail: boolean;
};

export function previewCreators(query: DiscoverQuery, limit = 3): PreviewCard[] {
  const pool = [...FIXTURE_CREATORS, ...WEB_SCOUT_CREATORS].map((candidate) => compute({ ...candidate }));
  return filterCandidates(pool, query)
    .filter((candidate) => !isInactive(candidate))
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, limit)
    .map((candidate) => ({
      id: candidate.id,
      mask: maskName(candidate.displayName),
      niche: candidate.nicheTags[0] ?? "gaming",
      platform: candidate.platform,
      size: compactNumber(candidate.followerCount),
      engagement: percentLabel(candidate.engagementRate),
      hasPublicEmail: isEmail(candidate.contact.value),
    }));
}

export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? part : `${part[0]}${"·".repeat(Math.min(part.length - 1, 4))}`))
    .join(" ");
}
