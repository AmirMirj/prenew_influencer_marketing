import { haystackOf, tokenize } from "@/src/domain/scoring";
import { matchesFollowerBand } from "@/src/domain/validate";
import type { Candidate, DiscoverQuery } from "@/src/domain/types";

export function filterCandidates(
  candidates: Candidate[],
  query: DiscoverQuery,
): Candidate[] {
  const tokens = tokenize(query.keywords);

  return candidates.filter((candidate) => {
    if (candidate.market.toUpperCase() !== query.market.toUpperCase()) {
      return false;
    }
    if (candidate.language.toLowerCase() !== query.language.toLowerCase()) {
      return false;
    }
    if (!matchesFollowerBand(candidate.followerCount, query.followerBand)) {
      return false;
    }
    if (tokens.length === 0) {
      return true;
    }
    const haystack = haystackOf(candidate);
    return tokens.some((token) => haystack.includes(token));
  });
}
