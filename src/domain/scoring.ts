import { PRENEW_BRAND } from "./brand";
import type { Candidate, DiscoverQuery, FitScore } from "./types";

const WEIGHTS = {
  audienceMatch: 0.4,
  engagementQuality: 0.3,
  brandFit: 0.3,
} as const;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "of",
  "to",
  "in",
  "on",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9äöüßàâéèêëïîôùûç-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function haystackOf(candidate: Candidate): string {
  return [
    candidate.displayName,
    candidate.handle,
    candidate.contentSummary,
    ...candidate.nicheTags,
    ...candidate.recentTopics,
  ]
    .join(" ")
    .toLowerCase();
}

export function scoreFit(candidate: Candidate, query: DiscoverQuery): FitScore {
  const audienceMatch = scoreAudienceMatch(candidate, query);
  const engagementQuality = scoreEngagementQuality(candidate);
  const brandFit = scoreBrandFit(candidate);
  const total = Math.round(
    audienceMatch * WEIGHTS.audienceMatch +
      engagementQuality * WEIGHTS.engagementQuality +
      brandFit * WEIGHTS.brandFit,
  );

  return {
    total,
    audienceMatch,
    engagementQuality,
    brandFit,
    reasons: buildReasons(candidate, query, {
      audienceMatch,
      engagementQuality,
      brandFit,
    }),
  };
}

function scoreAudienceMatch(candidate: Candidate, query: DiscoverQuery): number {
  let score = 0;
  if (candidate.language.toLowerCase() === query.language.toLowerCase()) {
    score += 40;
  }
  if (candidate.market.toUpperCase() === query.market.toUpperCase()) {
    score += 30;
  }

  const tokens = tokenize(query.keywords);
  if (tokens.length > 0) {
    const haystack = haystackOf(candidate);
    const hits = tokens.filter((token) => haystack.includes(token));
    score += Math.round(30 * (hits.length / tokens.length));
  }

  return Math.min(100, score);
}

function scoreEngagementQuality(candidate: Candidate): number {
  const rateScore = Math.min(100, (candidate.engagementRate / 0.08) * 100);
  const microOrMid =
    candidate.followerCount >= 1_000 && candidate.followerCount <= 250_000;
  const sizeBonus = microOrMid ? 10 : 0;
  return Math.min(100, Math.round(rateScore * 0.9 + sizeBonus));
}

function scoreBrandFit(candidate: Candidate): number {
  const haystack = haystackOf(candidate);
  const hits = PRENEW_BRAND.relevantTokens.filter((token) => haystack.includes(token));
  return Math.min(100, Math.round((hits.length / 6) * 100));
}

function buildReasons(
  candidate: Candidate,
  query: DiscoverQuery,
  scores: Pick<FitScore, "audienceMatch" | "engagementQuality" | "brandFit">,
): string[] {
  const reasons: string[] = [];

  if (scores.brandFit >= 40) {
    const niche = candidate.nicheTags[0] ?? "gaming";
    reasons.push(`Creates ${niche} content that matches Prenew’s refurbished-PC audience`);
  }

  if (candidate.language.toLowerCase() === query.language.toLowerCase()) {
    reasons.push(`Publishes in ${candidate.language}, matching the ${query.market} brief`);
  }

  if (scores.engagementQuality >= 40) {
    const pct = (candidate.engagementRate * 100).toFixed(1);
    const topic = candidate.nicheTags[0] ?? "channel";
    reasons.push(`${pct}% engagement quality on recent ${topic} posts`);
  }

  if (reasons.length === 0) {
    reasons.push("Limited overlap with the brief; ranked for completeness only");
  }

  return reasons.slice(0, 3);
}
